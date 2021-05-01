import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Log, Realm } from '@app/mongo';
import { LeanDocument, Model } from 'mongoose';
import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { Job } from 'bullmq';
import {
  capitalize,
  FACTION,
  GuildInterface,
  guildsQueue,
  GuildSummaryInterface, OSINT_SOURCE,
  PLAYABLE_CLASS,
  toSlug,
} from '@app/core';
import { GuildMemberInterface } from '@app/core/interfaces/osint.interface';
import { differenceBy, intersectionBy } from "lodash";

@BullWorker({ queueName: guildsQueue.name })
export class GuildsWorker {
  private readonly logger = new Logger(
    GuildsWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @InjectModel(Log.name)
    private readonly LogModel: Model<Log>,
  ) { }

  @BullWorkerProcess(guildsQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      const args: GuildInterface & BattleNetOptions = { ...job.data };
      await job.updateProgress(5);

      const realm = await this.RealmModel
        .findOne(
          { $text: { $search: args.realm } },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .lean();
      if (!realm) return;

      const
        name_slug: string = toSlug(args.name),
        t: number = new Date().getTime() - (12 * 60 * 60 * 1000),
        original: GuildInterface = {
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name,
          members: []
        },
        updated: GuildInterface = {
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name,
          members: []
        };

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args._id,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      })

      await job.updateProgress(10);
      let guild = await this.GuildModel.findById(updated._id);

      if (guild) {
        if (args.createOnlyUnique) {
          this.logger.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${guild._id}:createOnlyUnique:${args.createOnlyUnique}`);
          await job.updateProgress(11);
          return 302;
        }
        if (!args.forceUpdate && (t < guild.updatedAt.getTime())) {
          this.logger.warn(`E:${(args.iteration) ? (args.iteration + ':') : ('')}${guild._id}:forceUpdate:${args.forceUpdate}`);
          await job.updateProgress(13);
          return 304;
        }
        Object.assign(original, guild.toObject());
        original.status_code = 100;
        await job.updateProgress(20);
      } else {
        guild = new this.GuildModel({
          _id: `${name_slug}@${realm.slug}`,
          name: capitalize(args.name),
          status_code: 100,
          realm: realm.slug,
          realm_id: realm._id,
          realm_name: realm.name,
          created_by: OSINT_SOURCE.GETGUILD,
          updated_by: OSINT_SOURCE.GETGUILD,
        })
        if (args.created_by) updated.created_by = args.created_by;
        await job.updateProgress(25);
      }

      //TODO inherit args
      if (args.updated_by) updated.updated_by = args.updated_by;

      await job.updateProgress(30);
      const summary = await this.summary(name_slug, updated.realm, this.BNet);
      Object.assign(updated, summary);

      await job.updateProgress(40);
      const roster = await this.roster(updated, this.BNet);
      if (roster.members.length > 0) Object.assign(updated, roster);

      if (guild.isNew) {
        await job.updateProgress(50);
        /** Check was guild renamed */
        const rename = await this.GuildModel.findOne({ id: guild.id, realm: guild.realm });
        if (rename) {
          /**
            TODO detect diffs & logs
            await this.diffs(rename, updated);
            await this.logs(rename, updated);
          */
        }
      } else {
        await job.updateProgress(60);
        await this.logs(original, updated);
        await this.diffs(original, updated);
      }

      Object.assign(guild, updated);
      await job.updateProgress(90);

      await guild.save();
      await job.updateProgress(100);
      return guild.status_code;
    } catch (e) {
      this.logger.error(`${GuildsWorker.name}, ${e}`);
    }
  }

  async summary(guild_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<GuildSummaryInterface>> {
    const summary: Partial<GuildSummaryInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/data/wow/guild/${realm_slug}/${guild_slug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      });
      if (!response || typeof response !== 'object') return summary

      const keys: string[] = ['id', 'name', 'achievement_points', 'member_count', 'created_timestamp'];

      await Promise.all(
        Object.entries(response).map(([key, value]) => {
          if (keys.includes(key) && value !== null) summary[key] = value;
          if (key === 'faction' && typeof value === 'object' && value !== null) {
            if (value.type && value.name === null) {
              if (value.type.toString().startsWith('A')) summary.faction = FACTION.A
              if (value.type.toString().startsWith('H')) summary.faction = FACTION.H
            } else {
              summary.faction = value.name
            }
          }
          if (key === 'realm' && typeof value === 'object' && value !== null) {
            if (value.id && value.name && value.slug) {
              summary.realm_id = value.id
              summary.realm_name = value.name
              summary.realm = value.slug
            }
          }
          if (key === 'lastModified') summary.last_modified = new Date(value);
        })
      );
      summary.status_code = 200;
      return summary
    } catch (e) {
      this.logger.error(`summary: ${guild_slug}@${realm_slug}:${e}`);
      return summary
    }
  }

  async roster(guild: GuildInterface, BNet: BlizzAPI) {
    const roster: { members: GuildMemberInterface[] } = { members: [] };
    const characters: Character[] = [];
    try {
      const guild_slug = toSlug(guild.name);
      const { members }: Record<string, any> = await BNet.query(`/data/wow/guild/${guild.realm}/${guild_slug}/roster`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      });
      let iteration: number = 0
      for (const member of members) {
        if ('character' in member && 'rank' in member) {
          iteration += 1;
          const _id: string = toSlug(`${member.character.name}@${guild.realm}`);
          const character_class = PLAYABLE_CLASS.has(member.character.playable_class.id) ? PLAYABLE_CLASS.get(member.character.playable_class.id) : undefined;

          const character_exist = await this.CharacterModel.findById(_id);

          if (!character_exist) {
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
              level: member.character.level ? member.character.level : undefined,
              last_modified: guild.last_modified,
              updated_by: OSINT_SOURCE.ROSTERGUILD,
              created_by: OSINT_SOURCE.ROSTERGUILD,
            })

            characters.push(character)
          }

          roster.members.push({
            _id: _id,
            id: member.character.id,
            rank: member.rank,
          });
        }
      }

      await this.CharacterModel.insertMany(characters, { rawResult: false })

      return roster
    } catch (e) {
      this.logger.error(`roster: ${guild._id}:${e}`);
      return roster
    }
  }

  async logs(original: GuildInterface, updated: GuildInterface): Promise<void> {
    try {
      const
        gm_member_new: GuildMemberInterface | undefined = updated.members.find(m => m.rank === 0),
        gm_member_old: GuildMemberInterface | undefined = original.members.find(m => m.rank === 0),
        block: LeanDocument<Log>[] = [];

      /** Guild Master have been changed */
      if (gm_member_old && gm_member_new && gm_member_old.id !== gm_member_new.id) {
        const gm_blocks: LeanDocument<Log>[] = await this.gm(gm_member_new, gm_member_old, original, updated);
        block.concat(gm_blocks)
      }

      const
        intersection: GuildMemberInterface[] = intersectionBy(updated.members, original.members, 'id'),
        joins: GuildMemberInterface[] = differenceBy(updated.members, original.members, 'id'),
        leaves: GuildMemberInterface[] = differenceBy(original.members, updated.members, 'id');

      await Promise.all(
        intersection.map(async (guild_member_new: GuildMemberInterface) => {
          const guild_member_old: GuildMemberInterface | undefined = original.members.find(({ id }) => id === guild_member_new.id);
          if (guild_member_old) {
            if (guild_member_old.rank !== 0 || guild_member_new.rank !== 0) {
              if (guild_member_new.rank > guild_member_old.rank) {
                // Demote
                block.push(
                  {
                    root_id: updated._id,
                    root_history: [updated._id],
                    original: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_old.rank}`,
                    updated: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_new.rank}`,
                    event: 'guild',
                    action: 'demote',
                    t0: original.last_modified || new Date(),
                    t1: updated.last_modified || new Date(),
                  },
                  {
                    root_id: guild_member_new._id,
                    root_history: [guild_member_new._id],
                    original: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_old.rank}`,
                    updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_new.rank}`,
                    event: 'character',
                    action: 'demote',
                    t0: original.last_modified || new Date(),
                    t1: updated.last_modified || new Date(),
                  }
                )
              }
              if (guild_member_new.rank < guild_member_old.rank) {
                // Promote
                block.push(
                  {
                    root_id: updated._id,
                    root_history: [updated._id],
                    original: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_old.rank}`,
                    updated: `${guild_member_new._id}:${guild_member_new.id}//Rank:${guild_member_new.rank}`,
                    event: 'guild',
                    action: 'promote',
                    t0: original.last_modified || new Date(),
                    t1: updated.last_modified || new Date(),
                  },
                  {
                    root_id: guild_member_new._id,
                    root_history: [guild_member_new._id],
                    original: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_old.rank}`,
                    updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member_new.rank}`,
                    event: 'character',
                    action: 'promote',
                    t0: original.last_modified || new Date(),
                    t1: updated.last_modified || new Date(),
                  }
                )
              }
            }
          }
        })
      );

      await Promise.all(
        joins.map(async guild_member => {
          // Join
          block.push(
            {
              root_id: updated._id,
              root_history: [updated._id],
              original: ``,
              updated: `${guild_member._id}:${guild_member.id}//Rank:${guild_member.rank}`,
              event: 'guild',
              action: 'join',
              t0: original.last_modified || new Date(),
              t1: updated.last_modified || new Date(),
            },
            {
              root_id: guild_member._id,
              root_history: [guild_member._id],
              original: ``,
              updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member.rank}`,
              event: 'character',
              action: 'join',
              t0: original.last_modified || new Date(),
              t1: updated.last_modified || new Date(),
            }
          )
        })
      );

      await Promise.all(
        leaves.map(async guild_member => {
          // More operative way to update character on leave
          await this.CharacterModel.findByIdAndUpdate(guild_member._id, { $unset: { guild: 1, guild_id: 1, guild_guid: 1, guild_rank: 1 } });
          block.push(
            {
              root_id: updated._id,
              root_history: [updated._id],
              original: ``,
              updated: `${guild_member._id}:${guild_member.id}//Rank:${guild_member.rank}`,
              event: 'guild',
              action: 'left',
              t0: original.last_modified || new Date(),
              t1: updated.last_modified || new Date(),
            },
            {
              root_id: guild_member._id,
              root_history: [guild_member._id],
              original: ``,
              updated: `${updated.name}@${updated.realm_name}:${updated.id}//Rank:${guild_member.rank}`,
              event: 'character',
              action: 'left',
              t0: original.last_modified || new Date(),
              t1: updated.last_modified || new Date(),
            }
          )
        })
      );
      await this.LogModel.insertMany(block, { rawResult: false });
      this.logger.log(`logs: ${updated._id} updated`);
    } catch (e) {
      this.logger.error(`logs: ${updated._id}:${e}`)
    }
  }

  async gm(member_new: GuildMemberInterface, member_old: GuildMemberInterface, original: GuildInterface, updated: GuildInterface): Promise<LeanDocument<Log>[]> {
    const block: LeanDocument<Log>[] = [];
    try {
      /** FIXME Update both GM hash ^^^priority */
      const
        gm_character_old = await this.CharacterModel.findById(member_old._id),
        gm_character_new = await this.CharacterModel.findById(member_new._id);

      if (!gm_character_new || !gm_character_old) {
        block.push(
          {
            root_id: updated._id,
            root_history: [updated._id],
            original: `${member_old._id}:${member_old.id}`, //GM title withdraw from
            updated: `${member_new._id}:${member_old.id}`, //GM title claimed by
            event: 'guild',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_new._id,
            root_history: [member_new._id],
            original: '',
            updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`, //GM title withdraw from
            event: 'character',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_old._id,
            root_history: [member_old._id],
            original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM title claimed by
            updated: '',
            event: 'character',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          }
        );
        return block;
      }

      if (!gm_character_old.hash_a || !gm_character_new.hash_a) {
        // Transfer title
        block.push(
          {
            root_id: updated._id,
            root_history: [updated._id],
            original: `${member_old._id}:${member_old.id}`, //GM title withdraw from
            updated: `${member_new._id}:${member_old.id}`, //GM title claimed by
            event: 'guild',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_new._id,
            root_history: [member_new._id],
            original: '',
            updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`, //GM title withdraw from
            event: 'character',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_old._id,
            root_history: [member_old._id],
            original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM title claimed by
            updated: '',
            event: 'character',
            action: 'title',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          }
        );
        return block;
      }

      if (gm_character_old.hash_a === gm_character_new.hash_a) {
        // Inherit title
        block.push(
          {
            root_id: updated._id,
            root_history: [updated._id],
            original: `${member_old._id}:${member_old.id}`, //GM Title transferred from
            updated: `${member_new._id}:${member_new.id}`, //GM Title transferred to
            event: 'guild',
            action: 'inherit',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_new._id,
            root_history: [member_new._id],
            original: '',
            updated: `${updated._id}:${updated.id}//${member_old._id}:${member_old.id}`, //GM Title received from
            event: 'character',
            action: 'inherit',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_old._id,
            root_history: [member_old._id],
            original: `${updated._id}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM Title transferred to
            updated: '',
            event: 'character',
            action: 'inherit',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          }
        );
      }

      if (gm_character_old.hash_a !== gm_character_new.hash_a) {
        // Transfer ownership
        block.push(
          {
            root_id: updated._id,
            root_history: [updated._id],
            original: `${member_old._id}:${member_old.id}`, //GM ownership withdraw from
            updated: `${member_new._id}:${member_old.id}`, //GM ownership claimed by
            event: 'guild',
            action: 'ownership',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_new._id,
            root_history: [member_new._id],
            original: '',
            updated: `${updated.name}@${updated.realm_name}:${updated.id}//${member_old._id}:${member_old.id}`, //GM ownership withdraw from
            event: 'character',
            action: 'ownership',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          },
          {
            root_id: member_old._id,
            root_history: [member_old._id],
            original: `${updated.name}@${updated.realm_name}:${updated.id}//${member_new._id}:${member_new.id}`, ////GM ownership claimed by
            updated: '',
            event: 'character',
            action: 'ownership',
            t0: original.last_modified || new Date(),
            t1: updated.last_modified || new Date(),
          }
        );
      }
      return block;
    } catch (e) {
      this.logger.error(`gm: ${updated._id}:${e}`);
      return block;
    }
  }

  async diffs(original: GuildInterface, updated: GuildInterface): Promise<void> {
    try {
      const
        detectiveFields: string[] = ['name', 'faction'],
        block: LeanDocument<Log>[] = [],
        t0: Date = original.last_modified || original.updatedAt || new Date(),
        t1: Date = updated.last_modified || updated.updatedAt || new Date();

      await Promise.all(
        detectiveFields.map(async (check: string) => {
          if (check in updated && check in updated && updated[check] !== original[check]) {
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
            block.push({
              root_id: updated._id,
              root_history: [updated._id],
              action: check,
              event: 'character',
              original: original[check],
              updated: updated[check],
              t0: t0,
              t1: t1,
            });
          }
        })
      );
      if (block.length > 1) await this.LogModel.insertMany(block, { rawResult: false });
      this.logger.log(`diffs: ${updated._id}, blocks: ${block.length}`)
    } catch (e) {
      this.logger.error(`diffs: ${updated._id}:${e}`)
    }
  }
}
