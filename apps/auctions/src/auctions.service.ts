import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { delay } from '@app/core/utils/converters';
import { Queue } from 'bullmq';
import { GLOBAL_DMA_KEY, auctionsQueue, IQAuction, IAARealm } from '@app/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';

@Injectable()
export class AuctionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    AuctionsService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(auctionsQueue.name)
    private readonly queue: Queue<IQAuction, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexAuctions(GLOBAL_DMA_KEY)
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private async indexAuctions(clearance: string = GLOBAL_DMA_KEY): Promise<void> {
    try {
      await delay(30);

      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) {
        this.logger.error(`indexAuctions: clearance: ${clearance} key not found`);
        return
      }

      await this.queue.drain(true);
      const offsetTime: number = parseInt(moment().subtract(30, 'minutes').format('x'));

      await this.RealmModel
        .aggregate([
          {
            $match: {
              auctions: { $lt: offsetTime }
            }
          },
          {
            $group: {
              _id: {
                connected_realm_id: '$connected_realm_id',
                auctions: '$auctions',
              },
              name: { $first: "$name" }
            },
          },
        ])
        .cursor({ batchSize: 5 })
        .eachAsync(async (realm: IAARealm) => {
          await this.queue.add(
            `${realm.name}`,
            {
              connected_realm_id: realm._id.connected_realm_id,
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token
            }
          )
        });
    } catch (errorException) {
      this.logger.error(`indexAuctions: ${errorException}`)
    }
  }
}
