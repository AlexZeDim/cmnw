import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { ItemInterface, itemsQueue, round2 } from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Item } from '@app/mongo';
import { Model } from "mongoose";

@BullWorker({ queueName: itemsQueue.name })
export class ItemsWorker {
  private readonly logger = new Logger(
    ItemsWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
  ) {}

  @BullWorkerProcess(itemsQueue.workerOptions)
  public async process(job: Job): Promise<number> {
    try {
      const args: { _id: number } & BattleNetOptions = { ...job.data }

      /** Check is exits */
      let item = await this.ItemModel.findById(args._id);
      /** If not, create */
      if (!item) {
        item = new this.ItemModel({
          _id: args._id,
        });
      }

      this.BNet = new BlizzAPI({
        region: args.region,
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken,
      });

      /** Request item data */
      const [getItemSummary, getItemMedia] = await (Promise as any).allSettled([
        this.BNet.query(`/data/wow/item/${args._id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' }
        }),
        this.BNet.query(`/data/wow/media/item/${args._id}`, {
          timeout: 10000,
          headers: { 'Battlenet-Namespace': 'static-eu' }
        })
      ]);

      if (getItemSummary.value) {
        /** Schema fields */
        const
          requested_item: Partial<ItemInterface> = {},
          fields: string[] = [
            'quality',
            'item_class',
            'item_subclass',
            'inventory_type',
          ],
          gold: string[] = ['purchase_price', 'sell_price'];

        /** key value TODO refactor merge */
        for (const [key] of Object.entries(getItemSummary.value)) {
          /** Loot type */
          if (key === 'preview_item') {
            if ('binding' in getItemSummary.value[key]) {
              requested_item.loot_type = getItemSummary.value[key]['binding'].type;
            }
          }

          if (fields.some(f => f === key)) {
            requested_item[key] = getItemSummary.value[key].name['en_GB'];
          } else {
            requested_item[key] = getItemSummary.value[key];
          }

          if (gold.some(f => f === key)) {
            if (key === 'sell_price') {
              item.asset_class.addToSet('VSP');
            }
            requested_item[key] = round2(getItemSummary.value[key] / 10000);
          }
        }

        Object.assign(item, requested_item)

        if (
          getItemMedia.value &&
          getItemMedia.value.assets &&
          getItemMedia.value.assets.length
        ) {
          item.icon = getItemMedia.value.assets[0].value;
        }

        await item.save();
        return 200;
      }
    } catch (e) {
      this.logger.error(`${ItemsWorker.name}: ${e}`);
      return 404;
    }
  }
}
