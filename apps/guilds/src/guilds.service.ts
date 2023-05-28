import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { Cron, CronExpression } from '@nestjs/schedule';
import ms from 'ms';
import {
  GLOBAL_OSINT_KEY,
  IQGuild,
  OSINT_SOURCE,
} from '@app/core';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(
    GuildsService.name, { timestamp: true },
  );

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
              iteration: iteration,
            }, {
              jobId: guild._id,
              priority: 5,
            },
          );
          i++;
          iteration++;
          if (i >= keys.length) i = 0;
        });

    } catch (errorException) {
      this.logger.error(`indexGuilds: ${errorException}`);
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
                iteration: iteration,
              }, {
                jobId: guild_slug,
                priority: 4,
              },
            );
            i++;
            iteration++;
            if (i >= keys.length) i = 0;
          }
        });
    } catch (errorException) {
      this.logger.error(`indexGuildsUnique: ${errorException}`);
    }
  }
}
