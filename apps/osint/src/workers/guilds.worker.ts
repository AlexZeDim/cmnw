import {
  BadRequestException,
  GatewayTimeoutException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  BullQueueInject,
  BullWorker,
  BullWorkerProcess,
} from '@anchan828/nest-bullmq';

import { BlizzAPI } from 'blizzapi';
import { Job, Queue } from 'bullmq';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { difference, get, intersection } from 'lodash';
import { snakeCase } from 'snake-case';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import {
  ACTION_LOG,
  capitalize,
  characterAsGuildMember,
  CharacterJobQueue,
  charactersQueue,
  EVENT_LOG,
  FACTION,
  findRealm,
  GuildExistsOrCreate,
  GuildJobQueue,
  guildsQueue,
  ICharacterGuildMember,
  IGuildRoster,
  IGuildSummary,
  incErrorCount,
  IRGuildRoster,
  isGuildRoster,
  OSINT_SOURCE,
  OSINT_TIMEOUT_TOLERANCE,
  PLAYABLE_CLASS,
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

@BullWorker({ queueName: guildsQueue.name })
export class GuildsWorker {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<CharacterJobQueue, number>,
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

  @BullWorkerProcess(guildsQueue.workerOptions)
  public async process(job: Job<GuildJobQueue, number>): Promise<number> {
    try {
      const { data: args } = job;

      const { guildEntity, isNew } = await this.guildExistOrCreate(args);
      const guildEntityOriginal = this.guildsRepository.create(guildEntity);
      const nameSlug = toSlug(guildEntity.name);

      await job.updateProgress(5);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });
      /**
       * Inherit safe values
       * from args in any case
       * summary overwrite later
       */
      if (args.updatedBy) guildEntity.updatedBy = args.updatedBy;
      await job.updateProgress(10);

      const summary = await this.getSummary(nameSlug, guildEntity.realm, this.BNet);
      Object.assign(guildEntity, summary);
      await job.updateProgress(25);

      const roster = await this.getRoster(guildEntity, this.BNet);
      roster.updatedAt = guildEntity.updatedAt;
      await this.updateRoster(guildEntityOriginal, roster);
      await job.updateProgress(50);

      if (isNew) {
        /** Check was guild renamed */
        const guildEntityById = await this.guildsRepository.findOneBy({
          id: guildEntityOriginal.id,
          realm: guildEntityOriginal.realm,
        });

        if (guildEntityById) {
          await this.diffGuildEntity(guildEntityById, guildEntity);
          await this.updateGuildMaster(guildEntityById, roster);
        }
      } else {
        await this.diffGuildEntity(guildEntityOriginal, guildEntity);
        await this.updateGuildMaster(guildEntityOriginal, roster);
      }

      await job.updateProgress(90);
      await this.guildsRepository.save(guildEntity);

      await job.updateProgress(100);
      return guildEntity.statusCode;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${GuildsWorker.name}, ${errorException}`);
      return 500;
    }
  }

  private async updateRoster(guildEntity: GuildsEntity, roster: IGuildRoster) {
    try {
      const guildsMembersEntities =
        await this.characterGuildsMembersRepository.findBy({
          guildGuid: guildEntity.guid,
        });

      const { members: updatedRosterMembers } = roster;

      if (!updatedRosterMembers.length) {
        this.logger.warn(`Guild roster for ${guildEntity.guid} was not found!`);
        return;
      }

      const originalRoster = new Map(
        guildsMembersEntities.map((guildMember) => [
          guildMember.characterId,
          guildMember,
        ]),
      );
      const updatedRoster = new Map(
        updatedRosterMembers.map((member) => [member.id, member]),
      );

      const originalRosterCharIds = Array.from(originalRoster.keys());
      const updatedRosterCharIds = Array.from(updatedRoster.keys());

      const membersIntersectIds = intersection(
          updatedRosterCharIds,
          originalRosterCharIds,
        ),
        membersJoinedIds = difference(updatedRosterCharIds, originalRosterCharIds),
        membersLeaveIds = difference(originalRosterCharIds, updatedRosterCharIds);

      const interLength = membersIntersectIds.length,
        joinsLength = membersJoinedIds.length,
        leaveLength = membersLeaveIds.length;

      if (interLength) {
        await lastValueFrom(
          from(membersIntersectIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberOriginal = originalRoster.get(guildMemberId);
                const guildMemberUpdated = updatedRoster.get(guildMemberId);
                const isRankChanged =
                  guildMemberUpdated.rank !== guildMemberOriginal.rank;
                if (!isRankChanged) return;

                const isNotGuildMaster =
                  guildMemberOriginal.rank !== 0 || guildMemberUpdated.rank !== 0;
                const isDemote = guildMemberUpdated.rank > guildMemberOriginal.rank;
                const isPromote = guildMemberUpdated.rank < guildMemberOriginal.rank;

                const eventAction = isDemote
                  ? ACTION_LOG.DEMOTE
                  : ACTION_LOG.PROMOTE;

                if (isNotGuildMaster) {
                  const logEntityGuildMemberDemote = [
                    this.logsRepository.create({
                      guid: guildMemberOriginal.characterGuid,
                      original: `${guildEntity.guid} | ${guildMemberUpdated.rank}`,
                      updated: `${guildEntity.guid} | ${guildMemberOriginal.rank}`,
                      event: EVENT_LOG.CHARACTER,
                      action: eventAction,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                    this.logsRepository.create({
                      guid: guildEntity.guid,
                      original: `${guildMemberOriginal.characterGuid} | ${guildMemberUpdated.rank}`,
                      updated: `${guildMemberOriginal.characterGuid} | ${guildMemberOriginal.rank}`,
                      event: EVENT_LOG.GUILD,
                      action: eventAction,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                  ];

                  await Promise.allSettled([
                    this.logsRepository.save(logEntityGuildMemberDemote),
                    this.charactersRepository.update(
                      { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
                      {
                        guildRank: guildMemberUpdated.rank,
                        updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                      },
                    ),
                    this.characterGuildsMembersRepository.update(
                      {
                        characterGuid: guildMemberOriginal.characterGuid,
                        guildGuid: guildEntity.guid,
                      },
                      {
                        rank: guildMemberUpdated.rank,
                        updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                      },
                    ),
                  ]);
                }
              } catch (errorException) {
                this.logger.error(
                  `logs: error with ${guildEntity.guid} on intersection`,
                );
              }
            }),
          ),
        );
      }

      if (joinsLength) {
        await lastValueFrom(
          from(membersJoinedIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberUpdated = updatedRoster.get(guildMemberId);
                const isNotGuildMaster = guildMemberUpdated.rank !== 0;

                const charactersGuildsMembersEntity =
                  this.characterGuildsMembersRepository.create({
                    guildGuid: guildEntity.guid,
                    guildId: guildEntity.id,
                    characterId: guildMemberUpdated.id,
                    characterGuid: guildMemberUpdated.guid,
                    realmId: guildEntity.realmId,
                    realmName: guildEntity.realmName,
                    realm: guildEntity.realm,
                    rank: guildMemberUpdated.rank,
                    createdBy: OSINT_SOURCE.GUILD_ROSTER,
                    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    lastModified: roster.updatedAt,
                  });

                if (isNotGuildMaster) {
                  const logEntityGuildMemberJoin = [
                    this.logsRepository.create({
                      guid: guildMemberUpdated.guid,
                      original: guildEntity.guid,
                      updated: `${guildEntity.guid} | ${guildMemberUpdated.rank}`,
                      event: EVENT_LOG.CHARACTER,
                      action: ACTION_LOG.JOIN,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                    this.logsRepository.create({
                      guid: guildEntity.guid,
                      original: guildMemberUpdated.guid,
                      updated: `${guildMemberUpdated.guid} | ${guildMemberUpdated.rank}`,
                      event: EVENT_LOG.GUILD,
                      action: ACTION_LOG.JOIN,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                  ];
                  await this.logsRepository.save(logEntityGuildMemberJoin);
                }
                await Promise.allSettled([
                  this.characterGuildsMembersRepository.save(
                    charactersGuildsMembersEntity,
                  ),
                  this.charactersRepository.update(
                    { guid: guildMemberUpdated.guid, id: guildMemberUpdated.id },
                    {
                      guild: guildEntity.name,
                      guildId: guildEntity.id,
                      guildGuid: guildEntity.guid,
                      guildRank: guildMemberUpdated.rank,
                      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    },
                  ),
                ]);
              } catch (errorException) {
                this.logger.error(
                  `logs: error with ${guildEntity.guid} on intersection`,
                );
              }
            }),
          ),
        );
      }

      if (leaveLength) {
        await lastValueFrom(
          from(membersLeaveIds).pipe(
            mergeMap(async (guildMemberId) => {
              try {
                const guildMemberOriginal = originalRoster.get(guildMemberId);
                const isNotGuildMaster = guildMemberOriginal.rank !== 0;

                if (isNotGuildMaster) {
                  const logEntityGuildMemberLeave = [
                    this.logsRepository.create({
                      guid: guildMemberOriginal.characterGuid,
                      original: `${guildEntity.guid} | ${guildMemberOriginal.rank}`,
                      updated: guildEntity.guid,
                      event: EVENT_LOG.CHARACTER,
                      action: ACTION_LOG.LEAVE,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                    this.logsRepository.create({
                      guid: guildEntity.guid,
                      original: `${guildMemberOriginal.characterGuid} | ${guildMemberOriginal.rank}`,
                      updated: guildMemberOriginal.characterGuid,
                      event: EVENT_LOG.GUILD,
                      action: ACTION_LOG.LEAVE,
                      originalAt: guildEntity.updatedAt,
                      updatedAt: roster.updatedAt,
                    }),
                  ];
                  await this.logsRepository.save(logEntityGuildMemberLeave);
                }
                await Promise.allSettled([
                  this.characterGuildsMembersRepository.delete({
                    guildGuid: guildEntity.guid,
                    characterGuid: guildMemberOriginal.characterGuid,
                  }),
                  this.charactersRepository.update(
                    {
                      guid: guildMemberOriginal.characterGuid,
                      guildGuid: guildEntity.guid,
                    },
                    {
                      guild: null,
                      guildId: null,
                      guildGuid: null,
                      guildRank: null,
                      updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    },
                  ),
                ]);
              } catch (errorException) {
                this.logger.error(
                  `logs: error with ${guildEntity.guid} on intersection`,
                );
              }
            }),
          ),
        );
      }
    } catch (errorException) {
      this.logger.error(`updateRoster: ${guildEntity.guid}:${errorException}`);
    }
  }

  private async getSummary(
    guildNameSlug: string,
    realmSlug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    const summary: Partial<IGuildSummary> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/data/wow/guild/${realmSlug}/${guildNameSlug}`,
        {
          timeout: OSINT_TIMEOUT_TOLERANCE,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
        },
      );

      if (!response || typeof response !== 'object') return summary;

      const keys = ['id', 'name', 'achievement_points', 'created_timestamp'];

      Object.entries(response).map(([key, value]) => {
        if (keys.includes(key) && value !== null) summary[snakeCase(key)] = value;
        if (key === 'faction' && typeof value === 'object' && value !== null) {
          if (value.type && value.name === null) {
            if (value.type.toString().startsWith('A')) summary.faction = FACTION.A;
            if (value.type.toString().startsWith('H')) summary.faction = FACTION.H;
          } else {
            summary.faction = value.name;
          }
        }
        if (key === 'realm' && typeof value === 'object' && value !== null) {
          if (value.id && value.name && value.slug) {
            summary.realmId = value.id;
            summary.realmName = value.name;
            summary.realm = value.slug;
          }
        }
        if (key === 'member_count') {
          summary.membersCount = value;
        }
        // TODO research
        if (key === 'last_modified') summary.lastModified = new Date(value);
      });

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
        `getSummary: ${guildNameSlug}@${realmSlug}:${summary.statusCode}`,
      );
      return summary;
    }
  }

  private async getRoster(
    guildEntity: GuildsEntity,
    BNet: BlizzAPI,
  ): Promise<IGuildRoster> {
    const roster: IGuildRoster = { members: [] };
    try {
      const guildNameSlug = toSlug(guildEntity.name);

      const response = await BNet.query<Readonly<IRGuildRoster>>(
        `/data/wow/guild/${guildEntity.realm}/${guildNameSlug}/roster`,
        {
          timeout: OSINT_TIMEOUT_TOLERANCE,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
        },
      );

      if (!isGuildRoster(response)) return roster;

      await lastValueFrom(
        from(response.members).pipe(
          mergeMap(async (member) => {
            try {
              const isMember = 'character' in member && 'rank' in member;
              if (!isMember) return;

              const isGM = member.rank === 0;
              const realmSlug = member.character.realm.slug ?? guildEntity.realm;
              const guid = toSlug(`${member.character.name}@${realmSlug}`);
              const level = member.character.level ? member.character.level : null;
              const characterClass = PLAYABLE_CLASS.has(
                member.character.playable_class.id,
              )
                ? PLAYABLE_CLASS.get(member.character.playable_class.id)
                : null;

              if (isGM) {
                /**
                 * @description Force update GM character
                 * @description for further diff compare
                 */
                await this.queue.add(
                  guid,
                  {
                    guid,
                    name: member.character.name,
                    realm: guildEntity.realm,
                    guild: guildEntity.name,
                    guildGuid: toGuid(guildNameSlug, guildEntity.realm),
                    guildId: guildEntity.id,
                    class: characterClass,
                    faction: guildEntity.faction,
                    level,
                    lastModified: guildEntity.lastModified,
                    updatedBy: OSINT_SOURCE.GUILD_ROSTER,
                    createdBy: OSINT_SOURCE.GUILD_ROSTER,
                    accessToken: BNet.accessTokenObject.access_token,
                    clientId: BNet.clientId,
                    clientSecret: BNet.clientSecret,
                    createOnlyUnique: false,
                    forceUpdate: 1,
                    guildRank: 0,
                    requestGuildRank: true,
                    region: 'eu',
                  },
                  {
                    jobId: guid,
                    priority: 2,
                  },
                );
              }

              const guildMember: ICharacterGuildMember = {
                guid,
                id: member.character.id,
                name: member.character.name,
                guildNameSlug,
                rank: member.rank,
                level,
                class: characterClass,
              };

              await characterAsGuildMember(
                this.charactersRepository,
                guildEntity,
                guildMember,
              );

              roster.members.push({
                guid,
                id: member.character.id,
                rank: member.rank,
                level,
              });
            } catch (errorException) {
              this.logger.error(
                `member: ${member.character.id} from ${guildEntity.guid}:${errorException}`,
              );
            }
          }, 20),
        ),
      );

      return roster;
    } catch (errorOrException) {
      roster.statusCode = get(errorOrException, 'response.status', 418);
      roster.statusCode = get(errorOrException, 'response.status', 418);
      const isTooManyRequests = roster.statusCode === 429;
      if (isTooManyRequests)
        await incErrorCount(
          this.keysRepository,
          BNet.accessTokenObject.access_token,
        );

      this.logger.error(`roster: ${guildEntity.guid}:${roster.statusCode}`);
      return roster;
    }
  }

  private async updateGuildMaster(
    guildEntity: GuildsEntity,
    updatedRoster: IGuildRoster,
  ) {
    const guildMasterOriginal =
      await this.characterGuildsMembersRepository.findOneBy({
        guildGuid: guildEntity.guid,
        rank: 0,
      });

    if (!guildMasterOriginal) return;

    const guildMasterUpdated = updatedRoster.members.find(
      (guildMember) => guildMember.rank === 0,
    );

    const isGuildMasterCharacterChanged =
      guildMasterOriginal.characterId !== guildMasterUpdated.id;
    if (!isGuildMasterCharacterChanged) {
      this.logger.warn(
        `Guild ${guildEntity.guid} doesn't change their Guild Master`,
      );
      return;
    }

    const [guildMasterCharacter, guildMasterUpdatedCharacter] = await Promise.all([
      this.charactersRepository.findOneBy({
        guid: guildMasterOriginal.characterGuid,
        hashA: Not(IsNull()),
      }),
      this.charactersRepository.findOneBy({
        guid: guildMasterUpdated.guid,
        hashA: Not(IsNull()),
      }),
    ]);

    const isGuildMastersHaveCharacters =
      !!guildMasterCharacter && !!guildMasterUpdatedCharacter;
    const logEntityGuildMasterEvents: LogsEntity[] = [];

    if (isGuildMastersHaveCharacters) {
      const isGuildMasterCharactersFamily =
        guildMasterCharacter.hashA === guildMasterUpdatedCharacter.hashA;

      const logEntityInheritGuildMaster = [
        this.logsRepository.create({
          guid: guildEntity.guid,
          original: guildMasterOriginal.characterGuid,
          updated: guildMasterUpdated.guid,
          event: EVENT_LOG.GUILD,
          action: isGuildMasterCharactersFamily
            ? ACTION_LOG.INHERIT
            : ACTION_LOG.OWNERSHIP,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildEntity.guid,
          original: guildMasterOriginal.characterGuid,
          updated: guildMasterUpdated.guid,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.TRANSIT,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildMasterOriginal.characterGuid,
          original: guildEntity.guid,
          updated: guildEntity.guid,
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TRANSIT,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildMasterUpdated.guid,
          original: guildEntity.guid,
          updated: guildEntity.guid,
          event: EVENT_LOG.CHARACTER,
          action: isGuildMasterCharactersFamily
            ? ACTION_LOG.INHERIT
            : ACTION_LOG.OWNERSHIP,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
      ];

      logEntityGuildMasterEvents.push(...logEntityInheritGuildMaster);
    } else {
      const logEntityInheritGuildMaster = [
        this.logsRepository.create({
          guid: guildEntity.guid,
          original: guildMasterOriginal.characterGuid,
          updated: guildMasterUpdated.guid,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.TITLE,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildEntity.guid,
          original: guildMasterOriginal.characterGuid,
          updated: guildMasterUpdated.guid,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.TRANSIT,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildMasterOriginal.characterGuid,
          original: guildEntity.guid,
          updated: guildEntity.guid,
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TRANSIT,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
        this.logsRepository.create({
          guid: guildMasterUpdated.guid,
          original: guildEntity.guid,
          updated: guildEntity.guid,
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TITLE,
          originalAt: guildEntity.updatedAt,
          updatedAt: updatedRoster.updatedAt,
        }),
      ];

      logEntityGuildMasterEvents.push(...logEntityInheritGuildMaster);
    }

    await this.logsRepository.save(logEntityGuildMasterEvents);

    const [logEvent] = logEntityGuildMasterEvents;
    this.logger.warn(
      `Guild ${guildEntity.guid} action event ${logEvent.action} has been logged`,
    );
  }

  private async guildExistOrCreate(
    guild: GuildJobQueue,
  ): Promise<GuildExistsOrCreate> {
    const forceUpdate = guild.forceUpdate || 1000 * 60 * 60 * 4;
    const nameSlug = toSlug(guild.name);
    const timestampNow = new Date().getTime();
    const realmEntity = await findRealm(this.realmsRepository, guild.realm);
    if (!realmEntity) {
      throw new NotFoundException(`Realm ${guild.realm} not found`);
    }

    const guid = toGuid(nameSlug, realmEntity.slug);

    const guildEntity = await this.guildsRepository.findOneBy({
      guid,
    });

    if (!guildEntity) {
      const guildNew = this.guildsRepository.create({
        guid: guid,
        id: guild.id || 100,
        name: capitalize(guild.name),
        realm: realmEntity.slug,
        realmId: realmEntity.id,
        realmName: realmEntity.name,
        statusCode: 100,
        createdBy: OSINT_SOURCE.GUILD_GET,
        updatedBy: OSINT_SOURCE.GUILD_GET,
      });

      if (guild.createdBy) guildNew.createdBy = guild.createdBy;

      return { guildEntity: guildNew, isNew: true };
    }

    /**
     * If guild exists
     * and createOnlyUnique initiated
     */
    if (guild.createOnlyUnique) {
      throw new BadRequestException(
        `createOnlyUnique: ${guild.createOnlyUnique} | ${guild.guid}`,
      );
    }
    /**
     * ...or guild was updated recently
     */
    if (timestampNow - forceUpdate < guildEntity.updatedAt.getTime()) {
      throw new GatewayTimeoutException(
        `forceUpdate: ${forceUpdate} | ${guild.guid}`,
      );
    }

    guildEntity.statusCode = 100;

    return { guildEntity, isNew: false };
  }

  private async diffGuildEntity(original: GuildsEntity, updated: GuildsEntity) {
    const logEntities: LogsEntity[] = [];
    const isNameChanged = original.name !== updated.name;
    const isFactionChanged = original.faction !== updated.faction;

    if (!isNameChanged && !isFactionChanged) {
      this.logger.warn(`Guild ${original.guid} diffs are not detected!`);
      return;
    }

    if (isNameChanged) {
      await this.logsRepository.update(
        {
          guid: original.guid,
        },
        {
          guid: updated.guid,
        },
      );

      const logEntityNameChanged = this.logsRepository.create({
        guid: updated.guid,
        original: original.name,
        updated: updated.name,
        event: EVENT_LOG.GUILD,
        action: ACTION_LOG.NAME,
        originalAt: original.updatedAt,
        updatedAt: updated.updatedAt,
      });

      logEntities.push(logEntityNameChanged);
    }

    if (isFactionChanged) {
      const logEntityFactionChanged = this.logsRepository.create({
        guid: updated.guid,
        original: original.name,
        updated: updated.name,
        event: EVENT_LOG.GUILD,
        action: ACTION_LOG.FACTION,
        originalAt: original.updatedAt,
        updatedAt: updated.updatedAt,
      });

      logEntities.push(logEntityFactionChanged);
    }

    await this.logsRepository.save(logEntities);
  }
}
