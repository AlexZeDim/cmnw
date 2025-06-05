import { BlizzAPI } from '@alexzedim/blizzapi';
import { Job } from 'bullmq';
import { hash64 } from 'farmhash';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { from, lastValueFrom, mergeMap } from 'rxjs';
import { difference, get } from 'lodash';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  ACTION_LOG,
  API_HEADERS_ENUM,
  apiConstParams,
  BlizzardApiCharacterMedia,
  BlizzardApiCharacterSummary,
  BlizzardApiPetsCollection,
  capitalize,
  CHARACTER_MEDIA_FIELD_MAPPING,
  CHARACTER_SUMMARY_FIELD_MAPPING,
  CharacterExistsOrCreate,
  CharacterJobQueue,
  charactersQueue,
  CharacterStatus,
  CharacterSummary,
  EVENT_LOG,
  findRealm, getRandomProxy,
  IMounts,
  incErrorCount,
  IPets,
  IPetType,
  IProfessions,
  isCharacterMedia,
  isCharacterSummary,
  isMountCollection,
  isPetsCollection,
  Media,
  OSINT_SOURCE,
  toDate,
  toGuid,
  toSlug,
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

@Processor(charactersQueue.name, charactersQueue.workerOptions)
@Injectable()
export class CharactersWorker extends WorkerHost {
  private readonly logger = new Logger(CharactersWorker.name, {
    timestamp: true,
  });

  private BNet: BlizzAPI;

  constructor(
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
  ) {
    super();
  }

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
      for (const key of CHARACTER_SUMMARY_FIELD_MAPPING.keys()) {
        const isInheritKeyValue = args[key] && !characterEntity[key];
        if (isInheritKeyValue) {
          characterEntity[key] = args[key];
        }
      }

      await job.updateProgress(10);

      const httpsAgent = await getRandomProxy(this.keysRepository);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
        httpsAgent: httpsAgent,
      });

      const status = await this.getStatus(
        nameSlug,
        characterEntity.realm,
        statusCheck,
        this.BNet,
      );

      if (status) Object.assign(characterEntity, status);

      await job.updateProgress(20);

      if (status.isValid) {
        const [summary, petsCollection, mountsCollection, media] =
          await Promise.allSettled([
            this.getSummary(nameSlug, characterEntity.realm, this.BNet),
            this.getPets(nameSlug, characterEntity.realm, this.BNet, true),
            this.getMounts(nameSlug, characterEntity.realm, this.BNet, true),
            // TODO this.getProfessions(nameSlug, characterEntity.realm, this.BNet),
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
       * TODO detective after transfer / rename
       * Check differences between req & original
       * only if characterEntityOriginal exists
       */
      if (!isNew) {
        const isUserNotGuildMember =
          characterEntityOriginal.guildGuid !== characterEntity.guildGuid &&
          !characterEntity.guildId;

        if (isUserNotGuildMember) {
          characterEntity.guildGuid = null;
          characterEntity.guild = null;
          characterEntity.guildRank = null;
          characterEntity.guildId = null;
        }
        await this.diffCharacterEntity(characterEntityOriginal, characterEntity);
        await job.updateProgress(90);
      }

      await this.charactersRepository.save(characterEntity);
      await job.updateProgress(100);
      return characterEntity.statusCode;
    } catch (errorOrException) {
      await job.log(errorOrException);
      this.logger.error(errorOrException);
      return 500;
    }
  }

  private async characterExistOrCreate(
    character: CharacterJobQueue,
  ): Promise<CharacterExistsOrCreate> {
    const forceUpdate = character.forceUpdate || 86400 * 1000;
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
        ...character,
        id: character.id || 1,
        guid: character.guid,
        name: capitalize(character.name),
        realm: realmEntity.slug,
        realmId: realmEntity.id,
        realmName: realmEntity.name,
      });

      if (character.lastModified)
        characterNew.lastModified = toDate(character.lastModified);

      /**
       * Assign values from queue
       * only if they were passed
       */
      characterNew.statusCode = 100;
      if (character.guild) characterNew.guild = character.guild;
      if (character.guildGuid) characterNew.guildGuid = character.guildGuid;
      if (character.guildId) characterNew.guildId = character.guildId;
      characterNew.createdBy = character.createdBy
        ? character.createdBy
        : OSINT_SOURCE.CHARACTER_GET;

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
      throw new Error(
        `createOnlyUnique: ${character.createOnlyUnique} | ${character.guid}`,
      );
    }
    /**
     * ...or character was updated recently
     */
    const updateSafe = timestampNow - forceUpdate;
    const updatedAt = characterEntity.updatedAt.getTime();
    const isUpdateSafe = updateSafe < updatedAt;
    if (isUpdateSafe) {
      throw new Error(
        `forceUpdate: ${character.guid} | ${updateSafe} < ${updatedAt}`,
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
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );
      characterStatus.isValid = false;

      if (statusResponse.id) characterStatus.id = statusResponse.id;
      if (statusResponse.is_valid) characterStatus.isValid = statusResponse.is_valid;
      if (statusResponse.last_modified)
        characterStatus.lastModified = toDate(statusResponse.last_modified);

      characterStatus.statusCode = 201;

      return characterStatus;
    } catch (errorOrException) {
      characterStatus.statusCode = get(errorOrException, 'response.status', 418);
      const isTooManyRequests = characterStatus.statusCode === 429;
      if (isTooManyRequests)
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );

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
  ): Promise<Partial<Media>> {
    const media: Partial<Media> = {};
    try {
      const response = await BNet.query<BlizzardApiCharacterMedia>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/character-media`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!isCharacterMedia(response)) return media;

      const { assets } = response;

      assets.map(({ key, value }) => {
        if (!CHARACTER_MEDIA_FIELD_MAPPING.has(key)) return;
        media[CHARACTER_MEDIA_FIELD_MAPPING.get(key)] = value;
      });

      return media;
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'response.status', 418);
      this.logger.error(`getMedia: ${nameSlug}@${realmSlug}:${statusCode}`);
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
        apiConstParams(API_HEADERS_ENUM.PROFILE),
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
        await this.mountsRepository.save(mountEntities);
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
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'response.status', 418);
      this.logger.error(`getMounts: ${nameSlug}@${realmSlug}:${statusCode}`);
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
      const petsEntities = new Map<number, PetsEntity>([]);
      const response = await BNet.query<BlizzardApiPetsCollection>(
        `/profile/wow/character/${realmSlug}/${nameSlug}/collections/pets`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
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

              const creatureId =
                'creature_display' in pet ? pet.creature_display.id : null;
              const characterPetId = pet.id;
              const petId = pet.species.id;
              const petName = isNamed ? pet.name : pet.species.name;
              const petLevel = Number(pet.level) || 1;
              const isActive = 'is_active' in pet;
              const petQuality = 'quality' in pet ? pet.quality.name : null;
              const breedId = 'stats' in pet ? pet.stats.breed_id : null;
              const isIndexNotUnique =
                isIndex && creatureId && !petsEntities.has(creatureId);

              updatedPetIds.add(pet.id);
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

              if (isIndexNotUnique) {
                const isPetExists = await this.petsRepository.exist({
                  where: { id: creatureId },
                });

                if (!isPetExists) {
                  const petEntity = this.petsRepository.create({
                    id: petId,
                    creatureId: creatureId,
                    name: pet.species.name,
                  });

                  petsEntities.set(creatureId, petEntity);
                }
              }

              if (!isAddedToCollection) {
                const characterPetEntity = this.charactersPetsRepository.create({
                  petId,
                  characterPetId,
                  creatureId,
                  petQuality,
                  breedId,
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

      const isNewEntityPets = Boolean(isIndex && petsEntities.size);
      if (isNewEntityPets) {
        await this.petsRepository.save(Array.from(petsEntities.values()));
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
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'response.status', 418);
      this.logger.error(`getPets: ${nameSlug}@${realmSlug}:${statusCode}`);
      return petsCollection;
    }
  }

  private async getProfessions(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IProfessions>> {
    const professions: Partial<IProfessions> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/profile/wow/character/${realmSlug}/${nameSlug}/professions`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!response) return professions;

      professions.professions = [];

      if ('primaries' in response) {
        const { primaries } = response;
        if (Array.isArray(primaries) && primaries.length) {
          primaries.forEach((primary) => {
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
              primary.tiers.forEach(
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
          secondaries.forEach((secondary) => {
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
              secondary.tiers.forEach(
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
    } catch (errorOrException) {
      const statusCode = get(errorOrException, 'response.status', 418);
      this.logger.error(`professions: ${nameSlug}@${realmSlug}:${statusCode}`);
      return professions;
    }
  }

  private async getSummary(
    nameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<CharacterSummary>> {
    const summary: Partial<CharacterSummary> = {};
    try {
      const response = await BNet.query<BlizzardApiCharacterSummary>(
        `/profile/wow/character/${realmSlug}/${nameSlug}`,
        apiConstParams(API_HEADERS_ENUM.PROFILE),
      );

      if (!isCharacterSummary(response)) {
        return summary;
      }

      for (const [key, path] of CHARACTER_SUMMARY_FIELD_MAPPING.entries()) {
        const value = get(response, path, null);
        if (value) summary[key] = value;
      }

      summary.guid = toGuid(nameSlug, summary.realm);
      summary.lastModified = toDate(summary.lastModified);

      if (!summary.guild) {
        summary.guildId = null;
        summary.guild = null;
        summary.guildGuid = null;
        summary.guildRank = null;
      } else {
        summary.guildGuid = toGuid(summary.guild, summary.realm);
      }

      summary.statusCode = 200;

      return summary;
    } catch (errorOrException) {
      summary.statusCode = get(errorOrException, 'response.status', 418);
      const isTooManyRequests = summary.statusCode === 429;
      if (isTooManyRequests)
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );
      this.logger.error(
        `getSummary: ${nameSlug}@${realmSlug}:${summary.statusCode}`,
      );
      return summary;
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
          originalAt: toDate(original.lastModified || original.updatedAt),
          updatedAt: toDate(updated.lastModified || updated.updatedAt),
        });

        await this.logsRepository.save(logEntity);
      }
    } catch (errorOrException) {
      this.logger.error(`diffCharacterEntity: ${original.guid}:${errorOrException}`);
    }
  }
}
