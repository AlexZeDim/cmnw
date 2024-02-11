import { Injectable, Logger } from '@nestjs/common';
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
import ms from 'ms';
import {
  getKeys,
  GLOBAL_OSINT_KEY,
  GuildJobQueue,
  OSINT_GUILD_LIMIT,
  OSINT_SOURCE,
} from '@app/core';

@Injectable()
export class GuildsService {
  private offset = 0;
  private keyEntities: KeysEntity[];
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
        throw new Error(`${jobs} jobs found`);
      }

      let guildIteration = 0;
      this.keyEntities = await getKeys(this.keysRepository, clearance);

      let length = this.keyEntities.length;

      await this.GuildModel.find<Guild>()
        .sort({ updatedAt: 1 })
        .skip(this.offset)
        .limit(OSINT_GUILD_LIMIT)
        .cursor({ batchSize: 5000 })
        .eachAsync(async (guild) => {
          const { client, secret, token } =
            this.keyEntities[guildIteration % length];

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
              clientId: client,
              clientSecret: secret,
              accessToken: token,
              iteration: guildIteration,
            },
            {
              jobId: guild._id,
              priority: 5,
            },
          );

          guildIteration = guildIteration + 1;
          const isKeyRequest = guildIteration % 1000 == 0;
          if (isKeyRequest) {
            this.keyEntities = await getKeys(this.keysRepository, clearance);
            length = this.keyEntities.length;
          }
        });
    } catch (errorOrException) {
      this.logger.error(`indexGuildsFromMongo ${errorOrException}`);
    }
  }
}
