import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Guild } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { getKeys, GLOBAL_OSINT_KEY, GuildJobQueue, OSINT_SOURCE } from '@app/core';
import ms from 'ms';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name, { timestamp: true });

  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @BullQueueInject(guildsQueue.name)
    private readonly queue: Queue<GuildJobQueue, number>,
  ) {}

  @Cron(CronExpression.EVERY_4_HOURS)
  async indexGuildsFromMongo(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      const jobs: number = await this.queue.count();
      if (jobs > 1000) {
        throw new NotFoundException(`indexGuildsFromMongo: ${jobs} jobs found`);
      }

      const keyEntities = await getKeys(this.keysRepository, clearance);

      let i = 0;
      let iteration = 0;

      await this.GuildModel.find<Guild>()
        .sort({ updatedAt: 1 })
        .cursor()
        .eachAsync(async (guild) => {
          await this.queue.add(
            guild._id,
            {
              guid: guild._id,
              id: guild.id,
              name: guild.name,
              realm: guild.realm,
              faction: guild.faction,
              region: 'eu',
              updatedBy: OSINT_SOURCE.GUILD_INDEX,
              requestGuildRank: false,
              createOnlyUnique: false,
              forceUpdate: ms('4h'),
              clientId: keyEntities[i].client,
              clientSecret: keyEntities[i].secret,
              accessToken: keyEntities[i].token,
              iteration: iteration,
            },
            {
              jobId: guild._id,
              priority: 5,
            },
          );
          i++;
          iteration++;
          if (i >= keyEntities.length) i = 0;
        });
    } catch (errorException) {
      this.logger.error(`indexGuildsFromMongo: ${errorException}`);
    }
  }
}
