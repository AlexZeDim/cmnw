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
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Log, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { Job, Queue } from 'bullmq';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { differenceBy, intersectionBy } from 'lodash';

import {
  capitalize,
  FACTION,
  IGuildMember,
  guildsQueue,
  IGuildSummary,
  OSINT_SOURCE,
  OSINT_TIMEOUT_TOLERANCE,
  PLAYABLE_CLASS,
  toSlug,
  IQGuild,
  IRGuildRoster,
  IGuildRoster,
  EVENT_LOG,
  charactersQueue,
  IQCharacter,
  ACTION_LOG,
} from '@app/core';

@BullWorker({ queueName: guildsQueue.name })
export class GuildsWorker {
  private readonly logger = new Logger(GuildsWorker.name, { timestamp: true });

  private BNet: BlizzAPI;

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Log.name)
    private readonly LogModel: Model<Log>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue<IQCharacter, number>,
  ) {}

  @BullWorkerProcess(guildsQueue.workerOptions)
  public async process(job: Job<IQGuild, number>): Promise<number> {
    try {
      const args: IQGuild = { ...job.data };

      const guild = await this.checkExistOrCreate(args);
      const original = { ...guild.toObject() };
      const name_slug = toSlug(guild.name);

      await job.updateProgress(5);

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args._id,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });
      /**
       * Inherit safe values
       * from args in any case
       * summary overwrite later
       */
      if (args.updated_by) guild.updated_by = args.updated_by;
      await job.updateProgress(10);

      const summary = await this.summary(name_slug, guild.realm, this.BNet);
      Object.assign(guild, summary);

      await job.updateProgress(25);
      const roster = await this.roster(guild, this.BNet);

      if (roster.members.length > 0) Object.assign(guild, roster);
      await job.updateProgress(50);

      if (guild.isNew) {
        /** Check was guild renamed */
        const rename = await this.GuildModel.findOne({
          id: guild.id,
          realm: guild.realm,
        });
        if (rename) {
          await this.checkDiffs(rename, guild);
          await this.logs(rename, guild);
        }
      } else {
        await this.logs(original, guild);
        await this.checkDiffs(original, guild);
      }

      await job.updateProgress(90);

      await guild.save();
      await job.updateProgress(100);

      return guild.status_code;
    } catch (errorException) {
      await job.log(errorException);
      this.logger.error(`${GuildsWorker.name}, ${errorException}`);
      return 500;
    }
  }

  private async summary(
    guild_slug: string,
    realm_slug: string,
    BNet: BlizzAPI,
  ): Promise<Partial<IGuildSummary>> {
    const summary: Partial<IGuildSummary> = {};
    try {
      const response: Record<string, any> = await BNet.query(
        `/data/wow/guild/${realm_slug}/${guild_slug}`,
        {
          timeout: OSINT_TIMEOUT_TOLERANCE,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
        },
      );

      if (!response || typeof response !== 'object') return summary;

      const keys: string[] = [
        'id',
        'name',
        'achievement_points',
        'member_count',
        'created_timestamp',
      ];

      Object.entries(response).map(([key, value]) => {
        if (keys.includes(key) && value !== null) summary[key] = value;
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
            summary.realm_id = value.id;
            summary.realm_name = value.name;
            summary.realm = value.slug;
          }
        }
        if (key === 'lastModified') summary.last_modified = new Date(value);
      });

      summary.status_code = 200;
      return summary;
    } catch (errorException) {
      this.logger.error(`summary: ${guild_slug}@${realm_slug}:${errorException}`);
      return summary;
    }
  }

  private async roster(guild: Guild, BNet: BlizzAPI): Promise<IGuildRoster> {
    const roster: IGuildRoster = { members: [] };
    const characters: Character[] = [];
    try {
      const guild_slug = toSlug(guild.name);
      let iteration = 0;

      const { members }: Partial<IRGuildRoster> = await BNet.query(
        `/data/wow/guild/${guild.realm}/${guild_slug}/roster`,
        {
          timeout: OSINT_TIMEOUT_TOLERANCE,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' },
        },
      );

      if (!members || members.length === 0) {
        return roster;
      }

      await lastValueFrom(
        from(members).pipe(
          mergeMap(async (member) => {
            try {
              if ('character' in member && 'rank' in member) {
                iteration += 1;
                const _id: string = toSlug(
                  `${member.character.name}@${guild.realm}`,
                );
                const character_class = PLAYABLE_CLASS.has(
                  member.character.playable_class.id,
                )
                  ? PLAYABLE_CLASS.get(member.character.playable_class.id)
                  : undefined;

                if (member.rank === 0) {
                  // Force update GMs only
                  await this.queue.add(
                    _id,
                    {
                      _id: _id,
                      name: member.character.name,
                      realm: guild.realm,
                      guild_id: `${guild_slug}@${guild.realm}`,
                      guild: guild.name,
                      guild_guid: guild.id,
                      character_class,
                      faction: guild.faction,
                      level: member.character.level
                        ? member.character.level
                        : undefined,
                      last_modified: guild.last_modified,
                      updated_by: OSINT_SOURCE.ROSTERGUILD,
                      created_by: OSINT_SOURCE.ROSTERGUILD,
                      accessToken: BNet.accessToken,
                      clientId: BNet.clientId,
                      clientSecret: BNet.clientSecret,
                      createOnlyUnique: false,
                      forceUpdate: 1,
                      guildRank: true,
                      region: 'eu',
                    },
                    {
                      jobId: _id,
                      priority: 2,
                    },
                  );
                }

                const characterExist = await this.CharacterModel.findById(_id);

                if (characterExist) {
                  characterExist.updated_by = OSINT_SOURCE.ROSTERGUILD;

                  if (
                    guild.last_modified &&
                    characterExist.last_modified &&
                    guild.last_modified.getTime() >
                      characterExist.last_modified.getTime()
                  ) {
                    characterExist.realm = guild.realm;
                    characterExist.realm_id = guild.realm_id;
                    characterExist.realm_name = guild.realm_name;
                    characterExist.guild_id = guild._id;
                    characterExist.guild = guild.name;
                    characterExist.guild_guid = guild.id;
                    characterExist.guild_rank = member.rank;
                    characterExist.faction = guild.faction;
                    characterExist.level = member.character.level
                      ? member.character.level
                      : undefined;
                    characterExist.character_class = character_class;
                    characterExist.last_modified = guild.last_modified;
                  } else if (guild._id === characterExist.guild_id) {
                    characterExist.guild_rank = member.rank;
                  }

                  await characterExist.save();
                }

                if (!characterExist) {
                  const character = new this.CharacterModel({
                    _id,
                    id: member.character.id,
                    name: member.character.name,
                    realm: guild.realm,
                    realm_id: guild.realm_id,
                    realm_name: guild.realm_name,
                    guild_id: `${guild_slug}@${guild.realm}`,
                    guild: guild.name,
                    guild_rank: member.rank,
                    guild_guid: guild.id,
                    character_class,
                    faction: guild.faction,
                    level: member.character.level
                      ? member.character.level
                      : undefined,
                    last_modified: guild.last_modified,
                    updated_by: OSINT_SOURCE.ROSTERGUILD,
                    created_by: OSINT_SOURCE.ROSTERGUILD,
                  });

                  characters.push(character);
                }

                roster.members.push({
                  _id: _id,
                  id: member.character.id,
                  rank: member.rank,
                });
              }
            } catch (errorException) {
              this.logger.error(
                `member: ${member.character.id} from ${guild._id}:${errorException}`,
              );
            }
          }, 20),
        ),
      );

      if (characters.length > 0) {
        await this.CharacterModel.insertMany(characters, { rawResult: false });
        this.logger.log(`roster: ${characters.length} added`);
      }

      return roster;
    } catch (errorException) {
      this.logger.error(`roster: ${guild._id}:${errorException}`);
      return roster;
    }
  }

  private async logs(original: LeanDocument<Guild>, updated: Guild): Promise<void> {
    try {
      const gm_member_new: IGuildMember | undefined = updated.members.find(
          (m) => m.rank === 0,
        ),
        gm_member_old: IGuildMember | undefined = original.members.find(
          (m) => m.rank === 0,
        ),
        now = new Date(),
        block: Log[] = [];

      /** Guild Master have been changed */
      if (gm_member_old && gm_member_new && gm_member_old.id !== gm_member_new.id) {
        const gm_blocks = await this.gm(
          gm_member_new,
          gm_member_old,
          original,
          updated,
        );
        block.concat(gm_blocks);
      }

      const intersection = intersectionBy(updated.members, original.members, 'id'),
        joins = differenceBy(updated.members, original.members, 'id'),
        leaves = differenceBy(original.members, updated.members, 'id');

      const ILength = intersection.length,
        JLength = joins.length,
        LLength = leaves.length;

      if (ILength > 0) {
        this.logger.debug(`logs: ${updated._id} intersections ${ILength}`);

        await lastValueFrom(
          from(intersection).pipe(
            mergeMap(async (guild_member_new: IGuildMember) => {
              try {
                const guild_member_old: IGuildMember | undefined =
                  original.members.find(({ id }) => id === guild_member_new.id);
                if (guild_member_old) {
                  if (guild_member_old.rank !== 0 || guild_member_new.rank !== 0) {
                    if (guild_member_new.rank > guild_member_old.rank) {
                      // Demote
                      const characterLogDemote = new this.LogModel({
                        root_id: guild_member_new._id,
                        root_history: [guild_member_new._id],
                        original: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_old.rank}`,
                        updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_new.rank}`,
                        event: EVENT_LOG.CHARACTER,
                        action: ACTION_LOG.DEMOTE,
                        t0: original.last_modified || now,
                        t1: updated.last_modified || now,
                      });

                      const guildLogDemote = new this.LogModel({
                        root_id: updated._id,
                        root_history: [updated._id],
                        original: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_old.rank}`,
                        updated: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_new.rank}`,
                        event: EVENT_LOG.GUILD,
                        action: ACTION_LOG.DEMOTE,
                        t0: original.last_modified || now,
                        t1: updated.last_modified || now,
                      });

                      block.push(characterLogDemote, guildLogDemote);
                    }
                    if (guild_member_new.rank < guild_member_old.rank) {
                      // Promote
                      const characterLogPromote = new this.LogModel({
                        root_id: guild_member_new._id,
                        root_history: [guild_member_new._id],
                        original: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_old.rank}`,
                        updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_new.rank}`,
                        event: EVENT_LOG.CHARACTER,
                        action: ACTION_LOG.PROMOTE,
                        t0: original.last_modified || now,
                        t1: updated.last_modified || now,
                      });

                      const guildLogPromote = new this.LogModel({
                        root_id: updated._id,
                        root_history: [updated._id],
                        original: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_old.rank}`,
                        updated: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_new.rank}`,
                        event: EVENT_LOG.GUILD,
                        action: ACTION_LOG.PROMOTE,
                        t0: original.last_modified || now,
                        t1: updated.last_modified || now,
                      });

                      block.push(characterLogPromote, guildLogPromote);
                    }
                  }
                }
              } catch (errorException) {
                this.logger.error(
                  `logs: error with ${guild_member_new._id} on intersection`,
                );
              }
            }),
          ),
        );
      }

      if (JLength > 0) {
        this.logger.debug(`logs: ${updated._id} joins ${JLength}`);

        await lastValueFrom(
          from(joins).pipe(
            mergeMap(async (guild_member: IGuildMember) => {
              try {
                // Join
                const characterLogJoin = new this.LogModel({
                  root_id: guild_member._id,
                  root_history: [guild_member._id],
                  original: ' ',
                  updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member.rank}`,
                  event: EVENT_LOG.CHARACTER,
                  action: ACTION_LOG.JOIN,
                  t0: original.last_modified || now,
                  t1: updated.last_modified || now,
                });

                const guildLogJoin = new this.LogModel({
                  root_id: updated._id,
                  root_history: [updated._id],
                  original: ' ',
                  updated: `${guild_member._id}:${guild_member.id}//Rank:${guild_member.rank}`,
                  event: EVENT_LOG.GUILD,
                  action: ACTION_LOG.JOIN,
                  t0: original.last_modified || now,
                  t1: updated.last_modified || now,
                });

                block.push(characterLogJoin, guildLogJoin);
              } catch (errorException) {
                this.logger.error(`logs: error with ${guild_member._id} on join`);
              }
            }),
          ),
        );
      }

      if (LLength > 0) {
        this.logger.debug(`logs: ${updated._id} leaves ${LLength}`);

        await lastValueFrom(
          from(leaves).pipe(
            mergeMap(async (guild_member: IGuildMember) => {
              try {
                await this.CharacterModel.findOneAndUpdate(
                  { _id: guild_member._id, guild_id: original._id },
                  {
                    $unset: { guild: 1, guild_id: 1, guild_guid: 1, guild_rank: 1 },
                  },
                );

                // More operative way to update character on leave
                const guildLogLeave = new this.LogModel({
                  root_id: updated._id,
                  root_history: [updated._id],
                  original: ' ',
                  updated: `${guild_member._id}:${guild_member.id}//Rank:${guild_member.rank}`,
                  event: EVENT_LOG.GUILD,
                  action: ACTION_LOG.LEAVE,
                  t0: original.last_modified || new Date(),
                  t1: updated.last_modified || new Date(),
                });

                const characterLogLeave = new this.LogModel({
                  root_id: guild_member._id,
                  root_history: [guild_member._id],
                  original: ' ',
                  updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member.rank}`,
                  event: EVENT_LOG.CHARACTER,
                  action: ACTION_LOG.LEAVE,
                  t0: original.last_modified || new Date(),
                  t1: updated.last_modified || new Date(),
                });

                block.push(characterLogLeave, guildLogLeave);
              } catch (errorException) {
                this.logger.error(`logs: error with ${guild_member._id} on leave`);
              }
            }),
          ),
        );
      }

      if (block.length > 0) {
        await this.LogModel.insertMany(block, { rawResult: false });
        this.logger.log(
          `logs: ${updated._id} updated with ${block.length} log events`,
        );
      }
    } catch (errorException) {
      this.logger.error(`logs: ${updated._id}:${errorException}`);
    }
  }

  private async gm(
    member_new: IGuildMember,
    member_old: IGuildMember,
    original: LeanDocument<Guild>,
    updated: Guild,
  ): Promise<Log[]> {
    const block: Log[] = [];
    const now = new Date();
    try {
      this.logger.debug(
        `gm: guild (${updated._id}) | ${member_old._id} => ${member_new._id}`,
      );

      const gm_character_old = await this.CharacterModel.findById(member_old._id),
        gm_character_new = await this.CharacterModel.findById(member_new._id);

      if (!gm_character_new || !gm_character_old) {
        const guildTitleLog = new this.LogModel({
          root_id: updated._id,
          root_history: [updated._id],
          // GM title withdraw from
          original: `${member_old._id}:${member_old.id}`,
          // GM title claimed by
          updated: `${member_new._id}:${member_old.id}`,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmWithdrawTitleLog = new this.LogModel({
          root_id: member_new._id,
          root_history: [member_new._id],
          original: ' ',
          // GM title withdraw from
          updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`,
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmClaimTitleLog = new this.LogModel({
          root_id: member_old._id,
          root_history: [member_old._id],
          // GM title claimed by
          original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`,
          updated: ' ',
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        block.push(guildTitleLog, gmWithdrawTitleLog, gmClaimTitleLog);

        this.logger.debug(`gm: guild (${updated._id}) | ${ACTION_LOG.TITLE}`);
        return block;
      }

      if (!gm_character_old.hash_a || !gm_character_new.hash_a) {
        // Transfer title
        const guildTitleLog = new this.LogModel({
          root_id: updated._id,
          root_history: [updated._id],
          // GM title withdraw from
          original: `${member_old._id}:${member_old.id}`,
          // GM title claimed by
          updated: `${member_new._id}:${member_old.id}`,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmWithdrawTitleLog = new this.LogModel({
          root_id: member_new._id,
          root_history: [member_new._id],
          original: ' ',
          updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`, //GM title withdraw from
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmClaimTitleLog = new this.LogModel({
          root_id: member_old._id,
          root_history: [member_old._id],
          original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM title claimed by
          updated: ' ',
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.TITLE,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        block.push(guildTitleLog, gmWithdrawTitleLog, gmClaimTitleLog);

        this.logger.debug(`gm: guild (${updated._id}) | ${ACTION_LOG.TITLE}`);
        return block;
      }

      if (gm_character_old.hash_a === gm_character_new.hash_a) {
        // Inherit title
        const guildInheritLog = new this.LogModel({
          root_id: updated._id,
          root_history: [updated._id],
          // GM Title transferred from
          original: `${member_old._id}:${member_old.id}`,
          // GM Title transferred to
          updated: `${member_new._id}:${member_new.id}`,
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.INHERIT,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmTitleReceivedLog = new this.LogModel({
          root_id: member_new._id,
          root_history: [member_new._id],
          original: ' ',
          // GM Title received from
          updated: `${updated._id}:${updated.id}//${member_old._id}:${member_old.id}`,
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.INHERIT,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmTitleTransferredLog = new this.LogModel({
          root_id: member_old._id,
          root_history: [member_old._id],
          // GM Title transferred to
          original: `${updated._id}:${updated.id}//${member_new._id}:${member_new.id}`,
          updated: ' ',
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.INHERIT,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        block.push(guildInheritLog, gmTitleReceivedLog, gmTitleTransferredLog);

        this.logger.debug(`gm: guild (${updated._id}) | ${ACTION_LOG.INHERIT}`);
      }

      if (gm_character_old.hash_a !== gm_character_new.hash_a) {
        // Transfer ownership

        const guildOwnershipLog = new this.LogModel({
          root_id: updated._id,
          root_history: [updated._id],
          original: `${member_old._id}:${member_old.id}`, // GM ownership withdraw from
          updated: `${member_new._id}:${member_old.id}`, // GM ownership claimed by
          event: EVENT_LOG.GUILD,
          action: ACTION_LOG.OWNERSHIP,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmOwnershipWithdrawLog = new this.LogModel({
          root_id: member_new._id,
          root_history: [member_new._id],
          original: ' ',
          updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`, //GM ownership withdraw from
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.OWNERSHIP,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        const gmOwnershipClaimedLog = new this.LogModel({
          root_id: member_old._id,
          root_history: [member_old._id],
          original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM ownership claimed by
          updated: ' ',
          event: EVENT_LOG.CHARACTER,
          action: ACTION_LOG.OWNERSHIP,
          t0: original.last_modified || now,
          t1: updated.last_modified || now,
        });

        block.push(guildOwnershipLog, gmOwnershipWithdrawLog, gmOwnershipClaimedLog);

        this.logger.debug(`gm: guild (${updated._id}) | ${ACTION_LOG.OWNERSHIP}`);
      }

      return block;
    } catch (errorException) {
      this.logger.error(`gm: ${updated._id}:${errorException}`);
      return block;
    }
  }

  private async checkExistOrCreate(guild: IQGuild): Promise<Guild> {
    const forceUpdate: number = guild.forceUpdate || 1000 * 60 * 60 * 4;
    const nameSlug: string = toSlug(guild.name);
    const now: number = new Date().getTime();

    const realm = await this.RealmModel.findOne(
      { $text: { $search: guild.realm } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .lean();

    if (!realm) {
      throw new NotFoundException(`realm ${guild.realm} not found`);
    }

    const guildExist = await this.GuildModel.findById(`${nameSlug}@${realm.slug}`);

    if (!guildExist) {
      const guildNew = new this.GuildModel({
        _id: `${nameSlug}@${realm.slug}`,
        name: capitalize(guild.name),
        status_code: 100,
        realm: realm.slug,
        realm_id: realm._id,
        realm_name: realm.name,
        created_by: OSINT_SOURCE.GUILD_GET,
        updated_by: OSINT_SOURCE.GUILD_GET,
      });

      if (guild.created_by) guildNew.created_by = guild.created_by;

      return guildNew;
    }

    /**
     * If guild exists
     * and createOnlyUnique initiated
     */
    if (guild.createOnlyUnique) {
      throw new BadRequestException(
        `${guild.iteration ? guild.iteration + ':' : ''}${
          guild._id
        },createOnlyUnique: ${guild.createOnlyUnique}`,
      );
    }
    /**
     * ...or guild was updated recently
     */
    if (now - forceUpdate < guildExist.updatedAt.getTime()) {
      throw new GatewayTimeoutException(
        `${guild.iteration ? guild.iteration + ':' : ''}${
          guild._id
        },forceUpdate: ${forceUpdate}`,
      );
    }

    return guildExist;
  }

  private async checkDiffs(
    original: LeanDocument<Guild>,
    updated: Guild,
  ): Promise<void> {
    try {
      const detectiveFields: string[] = ['name', 'faction'],
        block: LeanDocument<Log>[] = [],
        now = new Date(),
        t0: Date = original.last_modified || original.updatedAt || now,
        t1: Date = updated.last_modified || updated.updatedAt || now;

      await lastValueFrom(
        from(detectiveFields).pipe(
          mergeMap(async (check) => {
            if (
              check in updated &&
              check in updated &&
              updated[check] !== original[check]
            ) {
              if (check === 'name') {
                await this.LogModel.updateMany(
                  {
                    root_id: updated._id,
                  },
                  {
                    root_id: updated._id,
                    $push: { root_history: updated._id },
                  },
                );
              }

              const guildLogCheck = new this.LogModel({
                root_id: updated._id,
                root_history: [updated._id],
                action: check,
                event: EVENT_LOG.GUILD,
                original: original[check],
                updated: updated[check],
                t0: t0,
                t1: t1,
              });

              block.push(guildLogCheck);
            }
          }),
        ),
      );

      if (block.length > 1)
        await this.LogModel.insertMany(block, { rawResult: false });
      this.logger.log(`diffs: ${updated._id}, blocks: ${block.length}`);
    } catch (errorException) {
      this.logger.error(`diffs: ${updated._id}:${errorException}`);
    }
  }
}
