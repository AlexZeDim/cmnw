import { Injectable, Logger } from '@nestjs/common';
import BlizzAPI from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { GLOBAL_DMA_KEY, queueAuctions } from '@app/core';

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(
    AuctionsService.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(queueAuctions.name)
    private readonly queue: Queue,
  ) {
    this.indexAuctions(GLOBAL_DMA_KEY)
  }

  // TODO cron task
  async indexAuctions(clearance: string): Promise<void> {
    try {
      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) return

      await this.RealmModel
        .aggregate([
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
            jobId: `${realm._id.connected_realm_id}`,
            /*repeat: { TODO cron
              every: 900000
            }*/
          })
        })
    } catch (e) {
      this.logger.error(`indexAuctions: ${e}`)
    }
  }
}
