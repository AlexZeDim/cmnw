import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Item, Key } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { GLOBAL_KEY, queueItems } from '@app/core';
import { Queue } from 'bullmq';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(
    ItemsService.name, true,
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @BullQueueInject(queueItems.name)
    private readonly queue: Queue,
  ) {
    this.indexItems(GLOBAL_KEY, 0, 170100, true);
  }

  async indexItems(clearance: string, min: number = 1, max: number = 20, updateForce: boolean = true): Promise<void> {
    try {
      const key = await this.KeyModel.findOne({ tags: 'BlizzardAPI' });
      if (!key) return

      if (updateForce) {
        for (let i = min; i <= max; i++) {
          await this.queue.add(
            `${i}`,
            {
              _id: i,
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token },
            {
              jobId: `${i}`
            }
          )
        }
      } else {
        await this.ItemModel
          .find()
          .lean()
          .cursor({ batchSize: 1 })
          .eachAsync(async (item: Item) => {
            await this.queue.add(
              `${item._id}`,
              {
                _id: item._id,
                region: 'eu',
                clientId: key._id,
                clientSecret: key.secret,
                accessToken: key.token
              },
              {
                jobId: `${item._id}`
              }
            )
          })
      }
    } catch (e) {
      this.logger.error(`indexItems: ${e}`)
    }
  }
}
