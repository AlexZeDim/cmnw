import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import {
  CharacterSummaryInterface,
  MediaInterface,
  MountsInterface,
  PetsInterface,
  ProfessionsInterface,
  RaiderIoInterface,
  WowProgressInterface,
  WarcraftLogsInterface,
  charactersQueue,
  toSlug, capitalize, CharacterInterface, OSINT_SOURCE,
} from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Log, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { Job } from 'bullmq';
import { hash64 } from 'farmhash';
import axios from 'axios';
import Xray from 'x-ray';
import puppeteer from 'puppeteer';

@BullWorker({ queueName: charactersQueue.name })
export class CharactersWorker {
  private readonly logger = new Logger(
    CharactersWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Log.name)
    private readonly LogModel: Model<Log>
  ) {}

  @BullWorkerProcess(charactersQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      const args: BattleNetOptions & CharacterInterface = { ...job.data };
      await job.updateProgress(1);

      const realm = await this.RealmModel
        .findOne(
          { $text: { $search: args.realm } },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .lean();
      if (!realm) return

      const
        name_slug: string = toSlug(args.name),
        now: number = new Date().getTime() - (48 * 60 * 60 * 1000),
        original: CharacterInterface = {
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name
        },
        updated: CharacterInterface = {
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name
        };

      await job.updateProgress(5);

      let character = await this.CharacterModel.findById(original._id);
      await job.updateProgress(10);

      if (character) {
        // if character exists & guildRank true
        if (args.guildRank) {
          if (args.guild) {
            // inherit rank from args, if guild is the same
            if (character.guild === args.guild) {
              character.guild_rank = args.guild_rank
            }
            // if args has guild data, but character doesn't
            if (!character.guild || character.guild !== args.guild) {
              // and last_modified has args & character
              if (character.last_modified && args.last_modified) {
                // if timestamp from args > then character
                if (args.last_modified.getTime() > character.last_modified.getTime()) {
                  // inherit guild data
                  character.guild = args.guild
                  if (args.guild_guid) character.guild_guid = args.guild_guid;
                  if (args.guild_id) character.guild_id = args.guild_id;
                  if (args.guild_rank) character.guild_rank = args.guild_rank;
                }
              }
            }
            this.logger.log(`G:${(args.iteration) ? (args.iteration + ':') : ('')}${character._id},guildRank:${args.guildRank}`);
            await character.save()
            await job.updateProgress(12);
          }
        }
        /**
         * If character exists and createOnlyUnique initiated,
         * or updated recently return
         */
        if (args.createOnlyUnique) {
          this.logger.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${character._id},createOnlyUnique: ${args.createOnlyUnique}`);
          return 302
        }
        //TODO what if force update is time param?
        if (!args.forceUpdate && now < character.updatedAt.getTime()) {
          this.logger.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${character._id},forceUpdate: false`);
          return 304
        }
        /**
         * We create copy of character to compare it
         * with previous timestamp
         */
        Object.assign(original, character.toObject())
        character.status_code = 100
        await job.updateProgress(15);
      } else {
        character = new this.CharacterModel({
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name,
          created_by: OSINT_SOURCE.GETCHARACTER,
          updated_by: OSINT_SOURCE.GETCHARACTER,
        })
        /**
         * Assign values from args only
         * on character creation
         */
        if (args.guild) character.guild = args.guild;
        if (args.guild_guid) character.guild_guid = args.guild_guid;
        if (args.guild_id) character.guild_id = args.guild_id;
        if (args.created_by) character.created_by = args.created_by;
        await job.updateProgress(17);
      }
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
      await job.updateProgress(20);


      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      })

      const character_status: Record<string, any> = await this.BNet.query(`/profile/wow/character/${character.realm}/${name_slug}/status`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      }).catch(status_error => {
        if (status_error.response) {
          if (status_error.response.data && status_error.response.data.code) {
            //TODO optional returnOnError?
            updated.status_code = status_error.response.data.code
          }
        }
      })
      /**
       * Define character id for sure
       */
      if (character_status && character_status.id) {
        character.id = character_status.id
        if (character_status.lastModified) character.last_modified = character_status.lastModified
      }

      await job.updateProgress(25);
      if (character_status && character_status.is_valid && character_status.is_valid === true) {
        const [summary, pets_collection, mount_collection, professions, media] = await Promise.all([
          this.summary(name_slug, character.realm, this.BNet),
          this.pets(name_slug, character.realm, this.BNet),
          this.mounts(name_slug, character.realm, this.BNet),
          this.professions(name_slug, character.realm, this.BNet),
          this.media(name_slug, character.realm, this.BNet)
        ]);

        Object.assign(updated, summary);
        Object.assign(updated, pets_collection);
        Object.assign(updated, mount_collection);
        Object.assign(updated, professions);
        Object.assign(updated, media);
      }
      await job.updateProgress(50);
      /**
       * update RIO, WCL & Progress
       * by request from args
       */
      if (args.updateRIO) {
        const raider_io = await this.raiderio(character.name, character.realm);
        Object.assign(updated, raider_io);
        await job.updateProgress(60);
      }

      if (args.updateWCL) {
        const raider_io = await this.warcraftlogs(character.name, character.realm);
        Object.assign(updated, raider_io);
        await job.updateProgress(70);
      }

      if (args.updateWP) {
        const wow_progress = await this.wowprogress(character.name, character.realm);
        Object.assign(updated, wow_progress);
        await job.updateProgress(80);
      }

      /**
       * TODO detective after transfer / rename
       * Check differences between req & original
       * only if original
       */
      if (!character.isNew) {
        await this.diffs(original, updated);
        await job.updateProgress(90);
      }

      Object.assign(character, updated);

      await character.save();
      await job.updateProgress(100);
      return character.status_code;
    } catch (e) {
      this.logger.error(`${CharactersWorker.name}: ${e}`)
    }
  }

  private async media(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<MediaInterface>> {
    const media: Partial<MediaInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/character-media`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response || !response.assets) return media

      if (response.character && response.character.id) media.id = response.character.id

      const assets: { key: string, value: string }[] = response.assets;
      await Promise.all(assets.map(({key, value}) => {
        media[key] = value
      }))
      return media
    } catch (e) {
      this.logger.error(`media: ${name_slug}@${realm_slug}:${e}`)
    }
  }

  private async mounts(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<MountsInterface>> {
    const mounts_collection: Partial<MountsInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/mounts`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response || !response.mounts || !response.mounts.length) return mounts_collection
      const { mounts } = response;
      mounts_collection.mounts = []
      await Promise.all(mounts.map((m: { mount: { id: number; name: string; }; }) => {
        if ('mount' in m) {
          mounts_collection.mounts.push({
            _id: m.mount.id,
            name: m.mount.name
          })
        }
      }))
      return mounts_collection
    } catch (e) {
      this.logger.error(`mounts: ${name_slug}@${realm_slug}:${e}`)
      return mounts_collection
    }
  }

  private async pets(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<PetsInterface>> {
    const pets_collection: Partial<PetsInterface> = {};
    try {
      const
        hash_b: string[] = [],
        hash_a: string[] = [],
        response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/pets`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        });
      if (!response || !response.pets || !response.pets.length) return pets_collection
      const { pets } = response;
      pets_collection.pets = [];
      await Promise.all(pets.map((pet: { id: number; species: { name: string; }; name: string; is_active: boolean; level: { toString: () => string; }; }) => {
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
      }))
      if (hash_b.length) pets_collection.hash_b = BigInt(hash64(hash_b.toString())).toString(16);
      if (hash_a.length) pets_collection.hash_a = BigInt(hash64(hash_a.toString())).toString(16);
      return pets_collection
    } catch (error) {
      this.logger.error(`pets: ${name_slug}@${realm_slug}:${error}`)
      return pets_collection
    }
  }

  private async professions(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<ProfessionsInterface>> {
    const professions: Partial<ProfessionsInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/professions`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response) return professions
      professions.professions = [];
      if ('primaries' in response) {
        const { primaries } = response
        if (Array.isArray(primaries) && primaries.length) {
          await Promise.all(primaries.map(async primary => {
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
              await Promise.all(primary.tiers.map(async (tier: { tier: { id: number; name: string; }; skill_points: number; max_skill_points: number; }) => {
                if ('tier' in tier) {
                  professions.professions.push({
                    id: tier.tier.id,
                    name: tier.tier.name,
                    skill_points: tier.skill_points,
                    max_skill_points: tier.max_skill_points,
                    tier: 'Primary Tier'
                  })
                }
              }))
            }
          }))
        }
      }

      if ('secondaries' in response) {
        const { secondaries } = response
        if (Array.isArray(secondaries) && secondaries.length) {
          await Promise.all(
            secondaries.map(async secondary => {
              if (secondary.profession && secondary.profession.name && secondary.profession.id) {
                professions.professions.push({
                  name: secondary.profession.name,
                  id: secondary.profession.id,
                  tier: 'Secondary'
                })
              }
              if ('tiers' in secondary && Array.isArray(secondary.tiers) && secondary.tiers.length) {
                await Promise.all(
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
                )
              }
            })
          )
        }
      }
      return professions
    } catch (error) {
      this.logger.error(`professions: ${name_slug}@${realm_slug}:${error}`)
      return professions
    }
  }

  private async summary(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<CharacterSummaryInterface>> {
    const summary: Partial<CharacterSummaryInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response || typeof response !== 'object') return summary
      const keys_named: string[] = ['gender', 'faction', 'race', 'character_class', 'active_spec'];
      const keys: string[] = ['level', 'achievement_points'];
      await Promise.all(
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
        })
      )
      if (!summary.guild) {
        summary.guild_id = undefined;
        summary.guild = undefined;
        summary.guild_guid = undefined;
        summary.guild_rank = undefined;
      }
      summary.status_code = 200;
      return summary
    } catch (error) {
      this.logger.error(`summary: ${name_slug}@${realm_slug}:${error}`)
      return summary
    }
  }

  private async raiderio(name: string, realm_slug: string): Promise<Partial<RaiderIoInterface>> {
    const raider_io: Partial<RaiderIoInterface> = {};
    try {
      const response: Record<string, any> = await axios.get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=${realm_slug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`));
      if (!response || !response.data) return raider_io
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
    } catch (e) {
      this.logger.error(`raiderio: ${name}@${realm_slug}:${e}`);
      return raider_io;
    }
  }

  private async wowprogress(name: string, realm_slug: string): Promise<Partial<WowProgressInterface>> {
    const
      wowprogress: Partial<WowProgressInterface> = {},
      x = Xray();

    try {
      const wp: Record<string, any> = await x(encodeURI(`https://www.wowprogress.com/character/eu/${realm_slug}/${name}`), '.registeredTo', ['.language']);
      if (!Array.isArray(wp) || !wp || !wp.length) return wowprogress
      await Promise.all(
        wp.map(line => {
          const [key, value] = line.split(':')
          if (key === 'Battletag') wowprogress.battle_tag = value.trim();
          if (key === 'Looking for guild') wowprogress.transfer = value.includes('ready to transfer');
          if (key === 'Raids per week') {
            if (value.includes(' - ')) {
              const [from, to] = value.split(' - ');
              wowprogress.days_from = parseInt(from);
              wowprogress.days_to = parseInt(to)
            }
          }
          if (key === 'Specs playing') wowprogress.role = value.trim()
          if (key === 'Languages') wowprogress.languages = value.split(',').map((s: string) => s.toLowerCase().trim())
        })
      )
      return wowprogress
    } catch (e) {
      this.logger.error(`wowprogress: ${name}@${realm_slug}:${e}`);
      return wowprogress
    }
  }

  private async warcraftlogs(name: string, realm_slug: string): Promise<Partial<WarcraftLogsInterface>> {
    const warcraft_logs: Partial<WarcraftLogsInterface> = {};
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
    } catch (e) {
      this.logger.error(`warcraftlogs: ${name}@${realm_slug}:${e}`);
      return warcraft_logs;
    }
  }

  private async diffs(original: CharacterInterface, updated: CharacterInterface): Promise<void> {
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
    } catch (e) {
      this.logger.error(`diffs: ${original._id}:${e}`);
    }
  }
}

