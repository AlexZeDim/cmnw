import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { GLOBAL_OSINT_KEY, OSINT_SOURCE } from '@app/core';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(
    GuildsService.name, true,
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
    private readonly queue: Queue,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  async indexGuilds(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const jobs: number = await this.queue.count();
      if (jobs > 10000) {
        this.logger.error(`indexGuilds: ${jobs} jobs found`);
        return
      }

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        this.logger.error(`indexGuilds: ${keys.length} keys found`);
        return
      }

      let i: number = 0;
      let iteration: number = 0;

      await this.GuildModel
        .find()
        .sort({ updatedAt: 1 })
        .limit(10000)
        .cursor()
        .eachAsync(async (guild: Guild) => {
          await this.queue.add(
            guild._id,
            {
              _id: guild._id,
              name: guild.name,
              realm: guild.realm,
              faction: guild.faction,
              members: [],
              region: 'eu',
              updated_by: OSINT_SOURCE.INDEXGUILD,
              forceUpdate: 3600000,
              clientId: keys[i]._id,
              clientSecret: keys[i].secret,
              accessToken: keys[i].token,
              iteration: iteration,
            }, {
              jobId: guild._id,
              priority: 5,
            }
          )
          i++;
          iteration++;
          if (i >= keys.length) i = 0;
        });

    } catch (e) {
      this.logger.error(`indexGuilds: ${e}`)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async indexGuildsUnique(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        this.logger.error(`indexGuilds: ${keys.length} keys found`);
        return
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
                _id: guild_slug,
                name: name,
                realm: realm.slug,
                members: [],
                created_by: OSINT_SOURCE.UNIQUEGUILDS,
                updated_by: OSINT_SOURCE.UNIQUEGUILDS,
                forceUpdate: 3600000,
                createOnlyUnique: true,
                clientId: keys[i]._id,
                clientSecret: keys[i].secret,
                accessToken: keys[i].token,
                iteration: iteration,
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

    } catch (e) {
      this.logger.error(`indexGuildsFromCharacters: ${e}`)
    }
  }
}
