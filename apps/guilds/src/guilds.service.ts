import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { Cron, CronExpression } from '@nestjs/schedule';
import ms from 'ms';
import { BlizzAPI } from 'blizzapi';
import {
  FACTION,
  GLOBAL_OSINT_KEY,
  IQGuild,
  OSINT_SOURCE,
  RAID_FACTIONS,
  RAIDS,
  toSlug
} from '@app/core';

@Injectable()
export class GuildsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    GuildsService.name, { timestamp: true },
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(guildsQueue.name)
    private readonly queue: Queue<IQGuild, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexHallOfFame(GLOBAL_OSINT_KEY, false);
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async indexGuilds(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const jobs: number = await this.queue.count();
      if (jobs > 1000) {
        throw new NotFoundException(`indexGuilds: ${jobs} jobs found`);
      }

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      let i: number = 0;
      let iteration: number = 0;

      await this.GuildModel
        .find()
        .sort({ updatedAt: 1 })
        .cursor()
        .eachAsync(async (guild: Guild) => {
          await this.queue.add(
            guild._id,
            {
              guildRank: false,
              createOnlyUnique: false,
              _id: guild._id,
              name: guild.name,
              realm: guild.realm,
              faction: guild.faction,
              region: 'eu',
              updated_by: OSINT_SOURCE.INDEXGUILD,
              forceUpdate: ms('4h'),
              clientId: keys[i]._id,
              clientSecret: keys[i].secret,
              accessToken: keys[i].token,
              iteration: iteration
            }, {
              jobId: guild._id,
              priority: 5,
            }
          )
          i++;
          iteration++;
          if (i >= keys.length) i = 0;
        });

    } catch (errorException) {
      this.logger.error(`indexGuilds: ${errorException}`)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async indexGuildsUnique(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      let i: number = 0;
      let iteration: number = 0;

      await this.RealmModel
        .find()
        .cursor()
        .eachAsync(async (realm: Realm) => {
          const uniqueGuilds: string[] = await this.CharacterModel.distinct('guild_id', { 'realm': realm.slug });

          for (const guild_slug of uniqueGuilds) {
            const [name] = guild_slug.split('@');

            await this.queue.add(
              guild_slug,
              {
                region: 'eu',
                guildRank: false,
                _id: guild_slug,
                name: name,
                realm: realm.slug,
                created_by: OSINT_SOURCE.UNIQUEGUILDS,
                updated_by: OSINT_SOURCE.UNIQUEGUILDS,
                forceUpdate: ms('1h'),
                createOnlyUnique: true,
                clientId: keys[i]._id,
                clientSecret: keys[i].secret,
                accessToken: keys[i].token,
                iteration: iteration
              }, {
                jobId: guild_slug,
                priority: 4,
              }
            )
            i++;
            iteration++;
            if (i >= keys.length) i = 0;
          }
        });
    } catch (errorException) {
      this.logger.error(`indexGuildsUnique: ${errorException}`)
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexHallOfFame(
    clearance: string = GLOBAL_OSINT_KEY,
    onlyLast: boolean = true
  ): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`);
      }

      const [key] = keys;

      let i: number = 0;

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      for (const raid of RAIDS) {

        if (onlyLast && raid !== RAIDS[RAIDS.length - 1]) continue;

        for (const raidFaction of RAID_FACTIONS) {
          const { entries } = await this.BNet.query(`/data/wow/leaderboard/hall-of-fame/${raid}/${raidFaction}`, {
            timeout: 10000,
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          });

          for (const guild of entries) {
            const _id: string = `${toSlug(guild.name)}@${guild.realm.slug}`;

            const faction = raidFaction === 'HORDE' ? FACTION.H : FACTION.A;

            await this.queue.add(
              _id,
              {
                _id,
                name: guild.name,
                realm: guild.realm.slug,
                realm_id: guild.realm.id,
                realm_name: guild.realm.name,
                faction,
                created_by: OSINT_SOURCE.TOP100,
                updated_by: OSINT_SOURCE.TOP100,
                region: 'eu',
                clientId: key._id,
                clientSecret: key.secret,
                accessToken: key.token,
                forceUpdate: ms('1h'),
                iteration: guild.rank,
                guildRank: false,
                createOnlyUnique: false,
              }
            )

            i++;
            if (i >= keys.length) i = 0;
          }
        }
      }

    } catch (errorException) {
      this.logger.error(`indexHallOfFame: ${errorException}`)
    }
  }
}
