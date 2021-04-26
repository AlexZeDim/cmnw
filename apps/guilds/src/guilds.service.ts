import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Guild, Key } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { GLOBAL_OSINT_KEY } from '@app/core';
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
    @BullQueueInject(guildsQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexGuilds(GLOBAL_OSINT_KEY)
  }

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
              updated_by: 'OSINT-indexGuilds',
              forceUpdate: true,
              clientId: keys[i]._id,
              clientSecret: keys[i].secret,
              accessToken: keys[i].token,
              iteration: iteration,
            }, {
              jobId: guild._id,
            }
          )
          i++;
          iteration++;
          if (i >= keys.length) i = 0;
        })

    } catch (e) {
      this.logger.error(`${GuildsService.name}, ${e}`)
    }
  }
}
