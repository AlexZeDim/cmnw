import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { BadRequestException, GatewayTimeoutException, Logger, NotFoundException } from '@nestjs/common';
import { BlizzAPI } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Log, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { Job } from 'bullmq';
import { hash64 } from 'farmhash';
import puppeteer from 'puppeteer';
import { lastValueFrom } from 'rxjs';
import cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import {
  ICharacterSummary,
  IMedia,
  IMounts,
  IPets,
  IProfessions,
  IRaiderIO,
  IWowProgress,
  IWarcraftLogs,
  ICharacterStatus,
  charactersQueue,
  toSlug, capitalize,
  OSINT_SOURCE,
  OSINT_TIMEOUT_TOLERANCE,
  IQCharacter,
} from '@app/core';

@BullWorker({ queueName: charactersQueue.name })
export class CharactersWorker {
  private readonly logger = new Logger(
    CharactersWorker.name, { timestamp: true },
  );

  private BNet: BlizzAPI

  constructor(
    private httpService: HttpService,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Log.name)
    private readonly LogModel: Model<Log>
  ) {}

  @BullWorkerProcess(charactersQueue.workerOptions)
  public async process(job: Job<IQCharacter, number>): Promise<number> {
    try {
      const args: IQCharacter = { ...job.data };

      const character = await this.checkExistOrCreate(args);
      const original = { ...character.toObject() };
      const name_slug = toSlug(character.name);
      const statusCheck = character.updated_by === OSINT_SOURCE.REQUESTCHARACTER;

      await job.updateProgress(5);

      /**
       * Inherit safe values
       * from args in any case
       * summary overwrite later
       */
      if (args.race) character.race = args.race;
      if (args.level) character.level = args.level;
      if (args.gender) character.gender = args.gender;
      if (args.faction) character.faction = args.faction;
      if (args.looking_for_guild) character.looking_for_guild = args.looking_for_guild;
      if (args.character_class) character.character_class = args.character_class;
      if (args.last_modified) character.last_modified = args.last_modified;
      if (args.updated_by) character.updated_by = args.updated_by;
      if (args.character_class) character.character_class = args.character_class;
      if (args.active_spec) character.active_spec = args.active_spec;

      await job.updateProgress(10);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      });

      const status = await this.checkStatus(name_slug, character.realm, statusCheck, this.BNet);
      if (status) Object.assign(character, status);

      await job.updateProgress(20);

      if ('is_valid' in status && status.is_valid === true) {

        const [summary, pets_collection, mount_collection, professions, media] = await Promise.allSettled([
          this.summary(name_slug, character.realm, this.BNet),
          this.pets(name_slug, character.realm, this.BNet),
          this.mounts(name_slug, character.realm, this.BNet),
          this.professions(name_slug, character.realm, this.BNet),
          this.media(name_slug, character.realm, this.BNet)
        ]);

        if (summary.status === 'fulfilled') Object.assign(character, summary.value);
        if (pets_collection.status === 'fulfilled') Object.assign(character, pets_collection.value);
        if (mount_collection.status === 'fulfilled') Object.assign(character, mount_collection.value);
        if (professions.status === 'fulfilled') Object.assign(character, professions.value);
        if (media.status === 'fulfilled') Object.assign(character, media.value);
      }

      await job.updateProgress(50);
      /**
       * update RIO, WCL & Progress
       * by request from args
       */
      if (args.updateRIO) {
        const raiderIo = await this.raiderio(character.name, character.realm);
        Object.assign(character, raiderIo);
        await job.updateProgress(60);
      }

      if (args.updateWCL) {
        const warcraftLogs = await this.warcraftlogs(character.name, character.realm);
        Object.assign(character, warcraftLogs);
        await job.updateProgress(70);
      }

      if (args.updateWP) {
        const wowProgress = await this.wowprogress(character.name, character.realm);
        Object.assign(character, wowProgress);
        await job.updateProgress(80);
      }

      /**
       * TODO detective after transfer / rename
       * Check differences between req & original
       * only if original
       */
      if (!character.isNew) {
        if (original.guild_guid !== character.guild_guid) {
          if (!character.guild_id) {
            character.guild_id = undefined;
            character.guild = undefined;
            character.guild_rank = undefined;
            character.guild_guid = undefined;
          }
        }
        await this.checkDiffs(original, character);
        await job.updateProgress(90);
      }

      await character.save();
      await job.updateProgress(100);
      return character.status_code;
    } catch (errorException) {
      this.logger.error(`${CharactersWorker.name}: ${errorException}`)
    }
  }

  private async checkExistOrCreate(character: IQCharacter): Promise<Character> {
    const forceUpdate: number = character.forceUpdate || 86400 * 1000;
    const name_slug: string = toSlug(character.name);
    const now: number = new Date().getTime();

    const realm = await this.RealmModel
      .findOne(
        { $text: { $search: character.realm } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean();

    if (!realm) {
      throw new NotFoundException(`realm ${character.realm} not found`);
    }

    const characterExist = await this.CharacterModel.findById(character._id);

    if (!characterExist) {
      const characterNew = new this.CharacterModel({
        _id: character._id,
        name: capitalize(name_slug),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name
      });

      /**
       * Assign values from queue
       * only if they were passed
       */
      if (character.guild) characterNew.guild = character.guild;
      if (character.guild_guid) characterNew.guild_guid = character.guild_guid;
      if (character.guild_id) characterNew.guild_id = character.guild_id;
      if (character.created_by) characterNew.created_by = character.created_by;

      return characterNew;
    }

    /**
     * Update LFG status immediately
     * if it was passed from queue
     */
    if (character.looking_for_guild) {
      characterExist.looking_for_guild = character.looking_for_guild;
      this.logger.log(`LFG: ${characterExist._id},looking for guild: ${character.looking_for_guild}`);
      await characterExist.save();
    }

    /**
     * If character exists
     * and createOnlyUnique initiated
     */
    if (character.createOnlyUnique) {
      throw new BadRequestException(`${(character.iteration) ? (character.iteration + ':') : ('')}${character._id},createOnlyUnique: ${character.createOnlyUnique}`);
    }
    /**
     * ...or character was updated recently
     */
    if ((now - forceUpdate) < characterExist.updatedAt.getTime()) {
      throw new GatewayTimeoutException(`${(character.iteration) ? (character.iteration + ':') : ('')}${character._id},forceUpdate: ${forceUpdate}`);
    }

    characterExist.status_code = 100;

    return characterExist;
  }

  private async checkStatus(
    name_slug: string,
    realm_slug: string,
    status: boolean,
    BNet: BlizzAPI
  ): Promise<Partial<ICharacterStatus>> {
    const characterStatus: Partial<ICharacterStatus> = {};
    try {
      const character_status = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/status`, {
        params: {
          locale: 'en_GB',
          timeout: OSINT_TIMEOUT_TOLERANCE
        },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      });

      if (characterStatus.id) characterStatus.id = character_status.id;
      if ('is_valid' in characterStatus) characterStatus.is_valid = character_status.is_valid;
      if ('last_modified' in characterStatus) characterStatus.last_modified = character_status.lastModified;
      characterStatus.status_code = 201;

      return characterStatus;
    } catch (errorException) {
      if (errorException.response) {
        if (errorException.response.data && errorException.response.data.code) {
          characterStatus.status_code = errorException.response.data.code
        }
      }
      if (status) throw new NotFoundException(`Character: ${name_slug}@${realm_slug}, status: ${status}`);
      return characterStatus;
    }
  }

  private async media(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<IMedia>> {
    const media: Partial<IMedia> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/character-media`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' },
        timeout: OSINT_TIMEOUT_TOLERANCE,
      })

      if (!response || !response.assets) return media;

      if (response.character && response.character.id) media.id = response.character.id;

      const assets: { key: string, value: string }[] = response.assets;

      assets.map(({key, value}) => {
        media[key] = value
      });

      return media;
    } catch (errorException) {
      this.logger.error(`media: ${name_slug}@${realm_slug}:${errorException}`);
      return media;
    }
  }

  private async mounts(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI
  ): Promise<Partial<IMounts>> {
    const mounts_collection: Partial<IMounts> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/mounts`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' },
        timeout: OSINT_TIMEOUT_TOLERANCE,
      })

      if (!response || !response.mounts || !response.mounts.length) return mounts_collection;

      const { mounts } = response;

      mounts_collection.mounts = [];

      mounts.map((m: { mount: { id: number; name: string; }; }) => {
        if ('mount' in m) {
          mounts_collection.mounts.push({
            _id: m.mount.id,
            name: m.mount.name
          })
        }
      })

      return mounts_collection;
    } catch (errorException) {
      this.logger.error(`mounts: ${name_slug}@${realm_slug}:${errorException}`);
      return mounts_collection;
    }
  }

  private async pets(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI
  ): Promise<Partial<IPets>> {
    const pets_collection: Partial<IPets> = {};
    try {
      const
        hash_b: string[] = [],
        hash_a: string[] = [],
        response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/pets`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        });

      if (!response || !response.pets || !response.pets.length) return pets_collection;

      const { pets } = response;

      pets_collection.pets = [];

      pets.map((pet: { id: number; species: { name: string; }; name: string; is_active: boolean; level: { toString: () => string; }; }) => {
        pets_collection.pets.push({
          _id: pet.id,
          name: pet.species.name,
        })
        if ('is_active' in pet) {
          if ('name' in pet) hash_a.push(pet.name);
          hash_a.push(pet.species.name, pet.level.toString());
        }
        if ('name' in pet) hash_b.push(pet.name);
        hash_b.push(pet.species.name, pet.level.toString());
      })

      if (hash_b.length) pets_collection.hash_b = BigInt(hash64(hash_b.toString())).toString(16);
      if (hash_a.length) pets_collection.hash_a = BigInt(hash64(hash_a.toString())).toString(16);

      return pets_collection;
    } catch (error) {
      this.logger.error(`pets: ${name_slug}@${realm_slug}:${error}`)
      return pets_collection;
    }
  }

  private async professions(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI
  ): Promise<Partial<IProfessions>> {
    const professions: Partial<IProfessions> = {};
    try {

      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/professions`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' },
        timeout: OSINT_TIMEOUT_TOLERANCE,
      });

      if (!response) return professions;

      professions.professions = [];

      if ('primaries' in response) {
        const { primaries } = response
        if (Array.isArray(primaries) && primaries.length) {
          primaries.map(primary => {
            if (primary.profession && primary.profession.name && primary.profession.id) {
              const skill_tier: Partial<{ name: string, id: number, tier: string, specialization: string }> = {
                name: primary.profession.name,
                id: primary.profession.id,
                tier: 'Primary',
              }
              if (primary.specialization && primary.specialization.name) skill_tier.specialization = primary.specialization.name
              professions.professions.push(skill_tier)
            }
            if ('tiers' in primary && Array.isArray(primary.tiers) && primary.tiers.length) {
              primary.tiers.map(async (tier: { tier: { id: number; name: string; }; skill_points: number; max_skill_points: number; }) => {
                if ('tier' in tier) {
                  professions.professions.push({
                    id: tier.tier.id,
                    name: tier.tier.name,
                    skill_points: tier.skill_points,
                    max_skill_points: tier.max_skill_points,
                    tier: 'Primary Tier'
                  })
                }
              })
            }
          })
        }
      }

      if ('secondaries' in response) {
        const { secondaries } = response
        if (Array.isArray(secondaries) && secondaries.length) {
          secondaries.map(secondary => {
            if (secondary.profession && secondary.profession.name && secondary.profession.id) {
              professions.professions.push({
                name: secondary.profession.name,
                id: secondary.profession.id,
                tier: 'Secondary'
              })
            }
            if ('tiers' in secondary && Array.isArray(secondary.tiers) && secondary.tiers.length) {
              secondary.tiers.map((tier: { tier: { id: number; name: string; }; skill_points: number; max_skill_points: number; }) => {
                if ('tier' in tier) {
                  professions.professions.push({
                    id: tier.tier.id,
                    name: tier.tier.name,
                    skill_points: tier.skill_points,
                    max_skill_points: tier.max_skill_points,
                    tier: 'Secondary Tier'
                  })
                }
              })
            }
          })
        }
      }

      return professions;
    } catch (error) {
      this.logger.error(`professions: ${name_slug}@${realm_slug}:${error}`)
      return professions;
    }
  }

  private async summary(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI
  ): Promise<Partial<ICharacterSummary>> {
    const summary: Partial<ICharacterSummary> = {};
    try {

      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' },
        timeout: OSINT_TIMEOUT_TOLERANCE,
      })

      if (!response || typeof response !== 'object') return summary;

      const keys_named: string[] = ['gender', 'faction', 'race', 'character_class', 'active_spec'];
      const keys: string[] = ['level', 'achievement_points'];

      Object.entries(response).map(([key, value]) => {
        if (keys_named.includes(key) && value !== null && value.name) summary[key] = value.name
        if (keys.includes(key) && value !== null) summary[key] = value
        if (key === 'last_login_timestamp') summary.last_modified = value
        if (key === 'average_item_level') summary.average_item_level = value
        if (key === 'equipped_item_level') summary.equipped_item_level = value
        if (key === 'covenant_progress' && typeof value === 'object' && value !== null) {
          if (value.chosen_covenant && value.chosen_covenant.name) summary.chosen_covenant = value.chosen_covenant.name;
          if (value.renown_level) summary.renown_level = value.renown_level;
        }
        if (key === 'guild' && typeof value === 'object' && value !== null) {
          if (value.id && value.name) {
            summary.guild_id = toSlug(`${value.name}@${realm_slug}`);
            summary.guild = value.name;
            summary.guild_guid = value.id;
          }
        }
        if (key === 'realm' && typeof value === 'object' && value !== null) {
          if (value.id && value.name && value.slug) {
            summary.realm_id = value.id;
            summary.realm_name = value.name;
            summary.realm = value.slug;
          }
        }
        if (key === 'active_title' && typeof value === 'object' && value !== null) {
          if ('active_title' in value) {
            const { active_title } = value
            if (active_title.id) summary.hash_t = active_title.id.toString(16);
          }
        }
      });

      if (!summary.guild) {
        summary.guild_id = undefined;
        summary.guild = undefined;
        summary.guild_guid = undefined;
        summary.guild_rank = undefined;
      }

      summary.status_code = 200;

      return summary;
    } catch (error) {
      this.logger.error(`summary: ${name_slug}@${realm_slug}:${error}`)
      return summary;
    }
  }

  private async raiderio(
    name: string,
    realm_slug: string
  ): Promise<Partial<IRaiderIO>> {
    const raider_io: Partial<IRaiderIO> = {};
    try {
      const response = await lastValueFrom(this.httpService
        .get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=${realm_slug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`))
      );

      if (!response || !response.data) return raider_io;

      if ('raid_progression' in response.data) {
        const raid_progress: Record<string, any> = response.data['raid_progression'];
        const raid_tiers: { _id: string, progress: string }[] = [];
        for (const [key, value] of Object.entries(raid_progress)) {
          raid_tiers.push({
            _id: key,
            progress: value['summary']
          })
        }
        raider_io.raid_progress = raid_tiers;
      }

      if ('mythic_plus_scores_by_season' in response.data) {
        const rio_score = response.data['mythic_plus_scores_by_season']
        if (rio_score && Array.isArray(rio_score) && rio_score.length) {
          for (const rio of rio_score) {
            if ('scores' in rio) {
              raider_io.rio_score = rio.scores.all
            }
          }
        }
      }

      return raider_io;
    } catch (errorException) {
      this.logger.error(`raiderio: ${name}@${realm_slug}:${errorException}`);
      return raider_io;
    }
  }

  private async wowprogress(
    name: string,
    realm_slug: string
  ): Promise<Partial<IWowProgress>> {
    const wowprogress: Partial<IWowProgress> = {};
    try {
      const response = await lastValueFrom(
        this.httpService.get(encodeURI(`https://www.wowprogress.com/character/eu/${realm_slug}/${name}`))
      )

      const wowProgress = cheerio.load(response.data);
      const wpHTML = wowProgress
        .html('.language');

      wowProgress(wpHTML).each((_x, node) => {
        const characterText = wowProgress(node).text();
        const [key, value] = characterText.split(':');
        if (key === 'Battletag') wowprogress.battle_tag = value.trim();
        if (key === 'Looking for guild') wowprogress.transfer = value.includes('ready to transfer');
        if (key === 'Raids per week') {
          if (value.includes(' - ')) {
            const [from, to] = value.split(' - ');
            wowprogress.days_from = parseInt(from);
            wowprogress.days_to = parseInt(to);
          }
        }
        if (key === 'Specs playing') wowprogress.role = value.trim();
        if (key === 'Languages') wowprogress.languages = value.split(',').map((s: string) => s.toLowerCase().trim());
      });

      return wowprogress;
    } catch (errorException) {
      this.logger.error(`wowprogress: ${name}@${realm_slug}:${errorException}`);
      return wowprogress;
    }
  }

  private async warcraftlogs(
    name: string,
    realm_slug: string
  ): Promise<Partial<IWarcraftLogs>> {
    const warcraft_logs: Partial<IWarcraftLogs> = {};
    try {
      const browser = await puppeteer.launch({ args: [ '--no-sandbox', '--disable-setuid-sandbox' ] });
      const page = await browser.newPage();
      await page.goto(`https://www.warcraftlogs.com/character/eu/${realm_slug}/${name}#difficulty=5`);
      const [getXpath] = await page.$x('//div[@class=\'best-perf-avg\']/b');

      if (getXpath) {
        const bestPrefAvg = await page.evaluate(name => name['innerText'], getXpath);
        if (bestPrefAvg && bestPrefAvg !== '-') {
          warcraft_logs.wcl_percentile = parseFloat(bestPrefAvg)
        }
      }

      await browser.close();

      return warcraft_logs;
    } catch (errorException) {
      this.logger.error(`warcraftlogs: ${name}@${realm_slug}:${errorException}`);
      return warcraft_logs;
    }
  }

  private async checkDiffs(
    original: LeanDocument<Character>,
    updated: Character
  ): Promise<void> {
    try {
      const
        detectiveFields: string[] = ['name', 'realm_name', 'race', 'gender', 'faction'],
        block: LeanDocument<Log>[] = [],
        t0: Date = ((original.last_modified || original.updatedAt) || new Date()),
        t1: Date = ((updated.last_modified || updated.updatedAt) || new Date());

      await Promise.all(
        detectiveFields.map(async (check: string) => {
          if (check in original && check in updated && original[check] !== updated[check]) {
            if (check === 'name' || check === 'realm_name') {
              await this.LogModel.updateMany(
                {
                  root_id: original._id,
                },
                {
                  root_id: updated._id,
                  $push: { root_history: updated._id },
                },
              );
            }
            block.push({
              root_id: updated._id,
              root_history: [updated._id],
              action: check,
              event: 'character',
              original: `${capitalize(check)}: ${capitalize(original[check])}`,
              updated: `${capitalize(check)}: ${capitalize(updated[check])}`,
              t0: t0,
              t1: t1,
            });
          }
        })
      );

      if (block.length > 1) await this.LogModel.insertMany(block, { rawResult: false });
    } catch (errorException) {
      this.logger.error(`diffs: ${original._id}:${errorException}`);
    }
  }
}

