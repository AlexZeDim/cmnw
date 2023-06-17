import { BlizzAPI } from 'blizzapi';
import { Job } from 'bullmq';
import { hash64 } from 'farmhash';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { snakeCase } from 'snake-case';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import {
  BadRequestException,
  GatewayTimeoutException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  ACTION_LOG,
  capitalize,
  CharacterExistsOrCreate,
  charactersQueue,
  CharacterStatus,
  EVENT_LOG,
  CharacterJobQueue,
  ICharacterSummary,
  IMedia,
  IMounts,
  IPets,
  IPetType,
  IProfessions,
  IRaiderIO,
  IRaidProgressRIO,
  IWarcraftLog,
  IWowProgress,
  OSINT_SOURCE,
  OSINT_TIMEOUT_TOLERANCE,
  toSlug,
  findRealm,
  toGuid,
  isPetsCollection,
  isMountCollection,
  BlizzardApiPetsCollection,
} from '@app/core';

import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  GuildsEntity,
  KeysEntity,
  LogsEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';
import { difference } from 'lodash';

@BullWorker({
  queueName: charactersQueue.name,
  options: charactersQueue.workerOptions,
})
export class CharactersWorker {
  private readonly logger = new Logger(CharactersWorker.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(ProfessionsEntity)
    private readonly professionsRepository: Repository<ProfessionsEntity>,
    @InjectRepository(GuildsEntity)
    private readonly guildsRepository: Repository<GuildsEntity>,
    @InjectRepository(CharactersGuildsMembersEntity)
    private readonly characterGuildsMembersRepository: Repository<CharactersGuildsMembersEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersEntity)
    private readonly charactersRepository: Repository<CharactersEntity>,
    @InjectRepository(PetsEntity)
    private readonly petsRepository: Repository<PetsEntity>,
    @InjectRepository(MountsEntity)
    private readonly mountsRepository: Repository<MountsEntity>,
    @InjectRepository(CharactersPetsEntity)
    private readonly charactersPetsRepository: Repository<CharactersPetsEntity>,
    @InjectRepository(CharactersMountsEntity)
    private readonly charactersMountsRepository: Repository<CharactersMountsEntity>,
    @InjectRepository(LogsEntity)
    private readonly logsRepository: Repository<LogsEntity>,
  ) {}

  @BullWorkerProcess(charactersQueue.workerOptions)
  public async process(job: Job<CharacterJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;

      const { characterEntity, isNew } = await this.characterExistOrCreate(args);
      const characterEntityOriginal =
        this.charactersRepository.create(characterEntity);

      const nameSlug = toSlug(characterEntity.name);
      const statusCheck =
        characterEntity.updatedBy === OSINT_SOURCE.CHARACTER_REQUEST;

      await job.updateProgress(5);

      /**
       * Inherit safe values
       * from args in any case
       * summary overwrite later
       */
      if (args.race) characterEntity.race = args.race;
      if (args.level) characterEntity.level = args.level;
      if (args.gender) characterEntity.gender = args.gender;
      if (args.faction) characterEntity.faction = args.faction;
      // TODO
      // if (args.lookingForGuild) character.lookingForGuild = args.lookingForGuild;
      if (args.class) characterEntity.class = args.class;
      if (args.lastModified) characterEntity.lastModified = args.lastModified;
      if (args.updatedBy) characterEntity.updatedBy = args.updatedBy;
      if (args.specialization) characterEntity.specialization = args.specialization;

      await job.updateProgress(10);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      const status = await this.getStatus(
        nameSlug,
        characterEntity.realm,
        statusCheck,
        this.BNet,
      );

      if (status) Object.assign(characterEntity, status);

      await job.updateProgress(20);

      if (status.isValid === true) {
        const [summary, petsCollection, mountsCollection, media] =
          await Promise.allSettled([
            this.getSummary(nameSlug, characterEntity.realm, this.BNet),
            this.getPets(nameSlug, characterEntity.realm, this.BNet, true),
            this.getMounts(nameSlug, characterEntity.realm, this.BNet, true),
            // this.getProfessions(nameSlug, characterEntity.realm, this.BNet),
            this.getMedia(nameSlug, characterEntity.realm, this.BNet),
          ]);

        if (summary.status === 'fulfilled')
          Object.assign(characterEntity, summary.value);
        if (petsCollection.status === 'fulfilled')
          Object.assign(characterEntity, petsCollection.value);
        if (mountsCollection.status === 'fulfilled')
          Object.assign(characterEntity, mountsCollection.value);
        // TODO if (professions.status === 'fulfilled')
        // TODO Object.assign(characterEntity, professions.value);
        if (media.status === 'fulfilled')
          Object.assign(characterEntity, media.value);
      }

      await job.updateProgress(50);
      /**
       * update RIO, WCL & Progress
       * by request from args
       */
      if (args.updateRIO) {
        const raiderIo = await this.getRaiderIO(
          characterEntity.name,
          characterEntity.realm,
        );

        Object.assign(characterEntity, raiderIo);
        await job.updateProgress(60);
      }

      if (args.updateWCL) {
        const warcraftLogs = await this.getWarcraftLogs(
          characterEntity.name,
          characterEntity.realm,
        );

        Object.assign(characterEntity, warcraftLogs);
        await job.updateProgress(70);
      }

      if (args.updateWP) {
        const wowProgress = await this.getWowProgressProfile(
          characterEntity.name,
          characterEntity.realm,
        );

        Object.assign(characterEntity, wowProgress);
        await job.updateProgress(80);
      }

      /**
       * TODO detective after transfer / rename
       * Check differences between req & original
       * only if characterEntityOriginal exists
       */
      if (!isNew) {
        if (characterEntityOriginal.guildGuid !== characterEntity.guildGuid) {
          if (!characterEntity.guildId) {
            characterEntity.guildGuid = null;
            characterEntity.guild = null;
            characterEntity.guildRank = null;
            characterEntity.guildId = null;
          }
        }
        await this.diffCharacterEntity(characterEntityOriginal, characterEntity);
        await job.updateProgress(90);
      }

      await this.charactersRepository.save(characterEntity);
      await job.updateProgress(100);
      return characterEntity.statusCode;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${CharactersWorker.name}: ${errorException}`);
      return 500;
    }
  }

  private async characterExistOrCreate(
    character: CharacterJobQueue,
  ): Promise<CharacterExistsOrCreate> {
    const forceUpdate = character.forceUpdate || 86400 * 1000;
    const nameSlug = toSlug(character.name);
    const timestampNow = new Date().getTime();
    const realmEntity = await findRealm(this.realmsRepository, character.realm);
    if (!realmEntity) {
      throw new NotFoundException(`Realm ${character.realm} not found`);
    }

    const characterEntity = await this.charactersRepository.findOneBy({
      guid: character.guid,
    });

    if (!characterEntity) {
      const characterNew = this.charactersRepository.create({
        id: character.id || 1,
        guid: character.guid,
        name: capitalize(nameSlug),
        statusCode: 100,
        realm: realmEntity.slug,
        realmId: realmEntity.id,
        realmName: realmEntity.name,
      });

      /**
       * Assign values from queue
       * only if they were passed
       */
      if (character.guild) characterNew.guild = character.guild;
      if (character.guildGuid) characterNew.guildGuid = character.guildGuid;
      if (character.guildId) characterNew.guildId = character.guildId;
      if (character.createdBy) characterNew.createdBy = character.createdBy;

      return { characterEntity: characterNew, isNew: true };
    }

    /**
     * Update LFG status immediately
     * if it was passed from queue
     */
    /*
    if (character.lookingForGuild) {
      characterEntity.lookingForGuild = character.lookingForGuild;
      this.logger.log(
        `LFG: ${characterEntity._id}, looking for guild: ${character.looking_for_guild}`,
      );
      await characterEntity.save();
    }*/

    /**
     * If character exists
     * and createOnlyUnique initiated
     */
    if (character.createOnlyUnique) {
      throw new BadRequestException(
        `createOnlyUnique: ${character.createOnlyUnique} | ${character.guid}`,
      );
    }
    /**
     * ...or character was updated recently
     */
    if (timestampNow - forceUpdate < characterEntity.updatedAt.getTime()) {
      throw new GatewayTimeoutException(
        `forceUpdate: ${forceUpdate} | ${character.guid}`,
      );
    }

    characterEntity.statusCode = 100;

    return { characterEntity, isNew: false };
  }

  private async getStatus(
    nameSlug: string,
    realmSlug: string,
    status: boolean,
    BNet: BlizzAPI,
  ): Promise<Partial<CharacterStatus>> {
    const characterStatus: Partial<CharacterStatus> = {};

    try {
      const statusResponse: Record<string, any> = await BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/status`,
        {
          params: {
            locale: 'en_GB',
            timeout: OSINT_TIMEOUT_TOLERANCE,
          },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
        },
      );

      characterStatus.isValid = false;

      if (statusResponse.id) characterStatus.id = statusResponse.id;
      if (statusResponse.is_valid) characterStatus.isValid = statusResponse.is_valid;
      if (statusResponse.last_modified)
        characterStatus.lastModified = statusResponse.last_modified;

      characterStatus.statusCode = 201;

      return characterStatus;
    } catch (errorException) {
      if (errorException.response) {
        if (errorException.response.data && errorException.response.data.code) {
          characterStatus.statusCode = errorException.response.data.code;
        }
      }
      if (status)
        throw new NotFoundException(
          `Character: ${nameSlug}@${realmSlug}, status: ${status}`,
        );

      return characterStatus;
    }
  }

  private async getMedia(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IMedia>> {
    const media: Partial<IMedia> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/character-media`,
        {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        },
      );

      if (!response || !response.assets) return media;

      if (response.character && response.character.id)
        media.id = response.character.id;

      const assets: { key: string; value: string }[] = response.assets;

      assets.map(({ key, value }) => {
        media[key] = value;
      });

      return media;
    } catch (errorException) {
      this.logger.error(`getMedia: ${nameSlug}@${realmSlug}:${errorException}`);
      return media;
    }
  }

  private async getMounts(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
    isIndex = false,
  ): Promise<Partial<IMounts>> {
    const mountsCollection: Partial<IMounts> = {};
    try {
      const mountEntities: Array<MountsEntity> = [];
      const characterMountsEntities: Array<CharactersMountsEntity> = [];

      const response = await BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/mounts`,
        {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        },
      );

      if (!isMountCollection(response)) return mountsCollection;

      const { mounts } = response;

      const characterGuid = toGuid(nameSlug, realmSlug);

      const charactersMountEntities = await this.charactersMountsRepository.findBy({
        characterGuid,
      });

      const updatedMountIds = new Set<number>();
      const originalMountIds = new Set(
        charactersMountEntities.map((charactersMount) => charactersMount.mountId),
      );

      await lastValueFrom(
        from(response.mounts).pipe(
          mergeMap(async (mount) => {
            const isAddedToCollection = originalMountIds.has(mount.mount.id);
            updatedMountIds.add(mount.mount.id);

            if (isIndex) {
              const isMountExists = await this.mountsRepository.exist({
                where: { id: mount.mount.id },
              });

              if (!isMountExists) {
                const mountEntity = this.mountsRepository.create({
                  id: mount.mount.id,
                  name: mount.mount.name,
                });

                mountEntities.push(mountEntity);
              }
            }

            if (!isAddedToCollection) {
              const characterMountEntity = this.charactersMountsRepository.create({
                mountId: mount.mount.id,
                characterGuid,
              });

              characterMountsEntities.push(characterMountEntity);
            }
          }),
        ),
      );

      const isNewEntityPets = Boolean(isIndex && mountEntities.length);
      if (isNewEntityPets) {
        await this.charactersMountsRepository.save(mountEntities);
      }

      const removeMountIds = difference(
        Array.from(originalMountIds),
        Array.from(updatedMountIds),
      );

      await this.charactersMountsRepository.save(characterMountsEntities);
      await this.charactersMountsRepository.delete({
        characterGuid: characterGuid,
        mountId: In(removeMountIds),
      });

      mountsCollection.mountsNumber = mounts.length;

      return mountsCollection;
    } catch (errorException) {
      this.logger.error(`getMounts: ${nameSlug}@${realmSlug}:${errorException}`);
      return mountsCollection;
    }
  }

  private async getPets(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
    isIndex = false,
  ): Promise<Partial<IPets>> {
    const petsCollection: Partial<IPets> = {};
    try {
      const hashB: Array<string | number> = [];
      const hashA: Array<string | number> = [];
      const characterPetsEntities: Array<CharactersPetsEntity> = [];
      const petsEntities: Array<PetsEntity> = [];
      const response = await BNet.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        },
      );

      if (!isPetsCollection(response)) return petsCollection;

      const { pets } = response;

      const characterGuid = toGuid(nameSlug, realmSlug);

      const charactersPetsEntities = await this.charactersPetsRepository.findBy({
        characterGuid,
      });

      const updatedPetIds = new Set<number>();
      const originalPetIds = new Set(
        charactersPetsEntities.map((charactersPet) => charactersPet.petId),
      );

      await lastValueFrom(
        from(response.pets).pipe(
          mergeMap(async (pet: IPetType) => {
            try {
              const isAddedToCollection = originalPetIds.has(pet.id);
              const isNamed = 'name' in pet;

              updatedPetIds.add(pet.id);

              const petName = isNamed ? pet.name : pet.species.name;
              const petLevel = Number(pet.level) || 1;
              const isActive = 'is_active' in pet;
              if (isActive) {
                hashA.push(
                  isNamed
                    ? `${pet.name}.${pet.species.name}`
                    : `${pet.species.name}`,
                  pet.level,
                );
              }

              hashB.push(
                isNamed ? `${pet.name}.${pet.species.name}` : `${pet.species.name}`,
                pet.level,
              );

              if (isIndex) {
                const isPetExists = await this.petsRepository.exist({
                  where: { id: pet.id },
                });

                if (!isPetExists) {
                  const petEntity = this.petsRepository.create({
                    id: pet.id,
                    name: pet.species.name,
                  });

                  petsEntities.push(petEntity);
                }
              }

              if (!isAddedToCollection) {
                const characterPetEntity = this.charactersPetsRepository.create({
                  petId: pet.id,
                  characterGuid,
                  petName,
                  petLevel,
                  isActive,
                });

                characterPetsEntities.push(characterPetEntity);
              }
            } catch (error) {
              this.logger.error(error);
            }
          }, 5),
        ),
      );

      const isNewEntityPets = Boolean(isIndex && petsEntities.length);
      if (isNewEntityPets) {
        await this.charactersPetsRepository.save(petsEntities);
      }

      const removePetIds = difference(
        Array.from(originalPetIds),
        Array.from(updatedPetIds),
      );

      await this.charactersPetsRepository.save(characterPetsEntities);
      await this.charactersPetsRepository.delete({
        characterGuid: characterGuid,
        petId: In(removePetIds),
      });

      petsCollection.petsNumber = pets.length;

      if (hashB.length)
        petsCollection.hashB = BigInt(hash64(hashB.join('.'))).toString(16);
      if (hashA.length)
        petsCollection.hashA = BigInt(hash64(hashA.join('.'))).toString(16);

      return petsCollection;
    } catch (error) {
      this.logger.error(`getPets: ${nameSlug}@${realmSlug}:${error}`);
      return petsCollection;
    }
  }

  private async getProfessions(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IProfessions>> {
    const professions: Partial<IProfessions> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/profile/wow/character/${realm_slug}/${name_slug}/professions`,
        {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        },
      );

      if (!response) return professions;

      professions.professions = [];

      if ('primaries' in response) {
        const { primaries } = response;
        if (Array.isArray(primaries) && primaries.length) {
          primaries.map((primary) => {
            if (
              primary.profession &&
              primary.profession.name &&
              primary.profession.id
            ) {
              const skill_tier: Partial<{
                name: string;
                id: number;
                tier: string;
                specialization: string;
              }> = {
                name: primary.profession.name,
                id: primary.profession.id,
                tier: 'Primary',
              };
              if (primary.specialization && primary.specialization.name)
                skill_tier.specialization = primary.specialization.name;
              professions.professions.push(skill_tier);
            }
            if (
              'tiers' in primary &&
              Array.isArray(primary.tiers) &&
              primary.tiers.length
            ) {
              primary.tiers.map(
                async (tier: {
                  tier: { id: number; name: string };
                  skill_points: number;
                  max_skill_points: number;
                }) => {
                  if ('tier' in tier) {
                    professions.professions.push({
                      id: tier.tier.id,
                      name: tier.tier.name,
                      skillPoints: tier.skill_points,
                      maxSkillPoints: tier.max_skill_points,
                      tier: 'Primary Tier',
                    });
                  }
                },
              );
            }
          });
        }
      }

      if ('secondaries' in response) {
        const { secondaries } = response;
        if (Array.isArray(secondaries) && secondaries.length) {
          secondaries.map((secondary) => {
            if (
              secondary.profession &&
              secondary.profession.name &&
              secondary.profession.id
            ) {
              professions.professions.push({
                name: secondary.profession.name,
                id: secondary.profession.id,
                tier: 'Secondary',
              });
            }
            if (
              'tiers' in secondary &&
              Array.isArray(secondary.tiers) &&
              secondary.tiers.length
            ) {
              secondary.tiers.map(
                (tier: {
                  tier: { id: number; name: string };
                  skill_points: number;
                  max_skill_points: number;
                }) => {
                  if ('tier' in tier) {
                    professions.professions.push({
                      id: tier.tier.id,
                      name: tier.tier.name,
                      skillPoints: tier.skill_points,
                      maxSkillPoints: tier.max_skill_points,
                      tier: 'Secondary Tier',
                    });
                  }
                },
              );
            }
          });
        }
      }

      return professions;
    } catch (error) {
      this.logger.error(`professions: ${name_slug}@${realm_slug}:${error}`);
      return professions;
    }
  }

  private async getSummary(
    name_slug: string,
    realm_slug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<ICharacterSummary>> {
    const summary: Partial<ICharacterSummary> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/profile/wow/character/${realm_slug}/${name_slug}`,
        {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
          timeout: OSINT_TIMEOUT_TOLERANCE,
        },
      );

      if (!response || typeof response !== 'object') return summary;

      const keyValueName: string[] = [
        'gender',
        'faction',
        'race',
        'character_class',
        'active_spec',
      ];
      const keyValue: string[] = ['level', 'achievement_points'];

      Object.entries(response).map(([key, value]) => {
        if (keyValueName.includes(key) && value !== null && value.name)
          summary[snakeCase(key)] = value.name;
        if (keyValue.includes(key) && value !== null) summary[key] = value;
        if (key === 'last_login_timestamp') summary.lastModified = value;
        if (key === 'average_item_level') summary.averageItemLevel = value;
        if (key === 'equipped_item_level') summary.equippedItemLevel = value;

        if (key === 'guild' && value instanceof Object) {
          if (value.id && value.name) {
            summary.guildGuid = toSlug(`${value.name}@${realm_slug}`);
            summary.guild = value.name;
            summary.guildId = value.id;
          }
        }
        if (key === 'realm' && value instanceof Object) {
          if (value.id && value.name && value.slug) {
            summary.realmId = value.id;
            summary.realmName = value.name;
            summary.realm = value.slug;
          }
        }
        if (key === 'active_title' && value instanceof Object) {
          if ('active_title' in value) {
            const { active_title } = value;
            if (active_title.id) summary.hashT = active_title.id.toString(16);
          }
        }
      });
      // TODO make sure
      if (!summary.guild) {
        summary.guildId = null;
        summary.guild = null;
        summary.guildGuid = null;
        summary.guildRank = null;
      }

      summary.statusCode = 200;

      return summary;
    } catch (error) {
      this.logger.error(`summary: ${name_slug}@${realm_slug}:${error}`);
      return summary;
    }
  }

  private async getRaiderIO(
    name: string,
    realmSlug: string,
  ): Promise<Partial<IRaiderIO>> {
    const raiderIO: Partial<IRaiderIO> = {};
    try {
      const { data } = await this.httpService.axiosRef.get<any>(
        encodeURI(
          `https://raider.io/api/v1/characters/profile?region=eu&realm=${realmSlug}&name=${name}&fields=mythic_plus_scores_by_season:current,raid_progression`,
        ),
      );

      if (!data) return raiderIO;

      if ('raid_progression' in data) {
        const raidProgress: Record<string, any> = data.raid_progression;
        const raidTiers: Array<IRaidProgressRIO> = [];
        for (const [key, value] of Object.entries(raidProgress)) {
          raidTiers.push({
            id: key,
            progress: value.getSummary,
          });
        }
        raiderIO.raidProgress = raidTiers;
      }

      if ('mythic_plus_scores_by_season' in data) {
        const rio_score = data.mythic_plus_scores_by_season;
        if (rio_score && Array.isArray(rio_score) && rio_score.length) {
          for (const rio of rio_score) {
            if ('scores' in rio) {
              raiderIO.rioScore = rio.scores.all;
            }
          }
        }
      }

      return raiderIO;
    } catch (errorException) {
      this.logger.error(`getRaiderIO: ${name}@${realmSlug}:${errorException}`);
      return raiderIO;
    }
  }

  private async getWowProgressProfile(
    name: string,
    realmSlug: string,
  ): Promise<Partial<IWowProgress>> {
    const wowProgress: Partial<IWowProgress> = {};
    try {
      const { data } = await this.httpService.axiosRef.get<any>(
        encodeURI(`https://www.wowprogress.com/character/eu/${realmSlug}/${name}`),
      );

      if (!data) {
        return wowProgress;
      }

      const wpRoot = cheerio.load(data);
      const wpHTML = wpRoot.html('.language');

      wpRoot(wpHTML).each((_x, node) => {
        const characterText = wpRoot(node).text();
        const [key, value] = characterText.split(':');
        if (key === 'Battletag') wowProgress.battleTag = value.trim();
        if (key === 'Looking for guild')
          wowProgress.transfer = value.includes('ready to transfer');
        if (key === 'Raids per week') {
          if (value.includes(' - ')) {
            const [from, to] = value.split(' - ');
            wowProgress.daysFrom = parseInt(from);
            wowProgress.daysTo = parseInt(to);
          }
        }
        if (key === 'Specs playing') wowProgress.role = value.trim();
        if (key === 'Languages')
          wowProgress.languages = value
            .split(',')
            .map((s: string) => s.toLowerCase().trim());
      });

      return wowProgress;
    } catch (errorException) {
      this.logger.error(
        `getWowProgressProfile: ${name}@${realmSlug}:${errorException}`,
      );
      return wowProgress;
    }
  }

  private async getWarcraftLogs(
    name: string,
    realmSlug: string,
  ): Promise<Partial<IWarcraftLog>> {
    const warcraftLogs: Partial<IWarcraftLog> = {};
    try {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.goto(
        `https://www.warcraftlogs.com/character/eu/${realmSlug}/${name}#difficulty=5`,
      );
      const [getXpath] = await page.$x("//div[@class='best-perf-avg']/b");

      if (getXpath) {
        const bestPrefAvg = await page.evaluate(
          (nodeName: any) => nodeName.innerText,
          getXpath,
        );
        if (bestPrefAvg && bestPrefAvg !== '-') {
          warcraftLogs.wclMythicPercentile = parseFloat(bestPrefAvg);
        }
      }

      await browser.close();

      return warcraftLogs;
    } catch (errorException) {
      this.logger.error(`getWarcraftLogs: ${name}@${realmSlug}:${errorException}`);
      return warcraftLogs;
    }
  }

  private async diffCharacterEntity(
    original: CharactersEntity,
    updated: CharactersEntity,
  ): Promise<void> {
    try {
      const actionLogFields = [
        ACTION_LOG.NAME,
        // TODO ACTION_LOG.REALM,
        ACTION_LOG.RACE,
        ACTION_LOG.GENDER,
        ACTION_LOG.FACTION,
      ];

      for (const actionLogField of actionLogFields) {
        const hasField = !!original[actionLogField] && !!updated[actionLogField];
        if (!hasField) continue;

        const isFieldChanged = original[actionLogField] !== updated[actionLogField];
        if (!isFieldChanged) continue;

        const logEntity = this.logsRepository.create({
          guid: updated.guid,
          original: original[actionLogField],
          updated: updated[actionLogField],
          action: actionLogField,
          event: EVENT_LOG.CHARACTER,
          originalAt: original.lastModified || original.updatedAt,
          updatedAt: updated.lastModified || updated.updatedAt,
        });

        await this.logsRepository.save(logEntity);
      }
    } catch (errorException) {
      this.logger.error(`diffCharacterEntity: ${original.id}:${errorException}`);
    }
  }
}
