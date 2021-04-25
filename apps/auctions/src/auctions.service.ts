import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { GLOBAL_DMA_KEY, auctionsQueue } from '@app/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(
    AuctionsService.name, true,
  );

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(auctionsQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexAuctions(GLOBAL_DMA_KEY)
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async indexAuctions(clearance: string): Promise<void> {
    try {
      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) {
        this.logger.error(`indexAuctions: clearance: ${GLOBAL_DMA_KEY} key not found`);
        return
      }

      const t20: number = parseInt(moment().subtract(20, 'minutes').format('x'));

      await this.RealmModel
        .aggregate([
          {
            $match: {
              auctions: { $lt: t20 }
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
        .exec()
        .eachAsync(async (realm: { _id: { connected_realm_id: number, auctions: number }, name: string }) => {
          await this.queue.add(`${realm.name}`, {
            connected_realm_id: realm._id.connected_realm_id,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token
          }, {
            jobId: `${realm._id.connected_realm_id}`
          })
        })
    } catch (e) {
      this.logger.error(`indexAuctions: ${e}`)
    }
  }
}
