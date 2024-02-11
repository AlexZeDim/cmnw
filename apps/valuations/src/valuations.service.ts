import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Item, Key, Pricing, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import {
  ASSET_EVALUATION_PRIORITY, IVAAuctions,
  IQItemValuation, IVARealm,
  VALUATION_TYPE,
  valuationsQueue,
} from '@app/core';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { valuationsConfig } from '@app/configuration';
// import { Cron, CronExpression } from '@nestjs/schedule';


@Injectable()
export class ValuationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    ValuationsService.name, { timestamp: true },
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Pricing.name)
    private readonly PricingModel: Model<Pricing>,
    @InjectModel(Auction.name)
    private readonly AuctionsModel: Model<Auction>,
    @BullQueueInject(valuationsQueue.name)
    private readonly queue: Queue<IQItemValuation, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.clearQueue();
    await this.buildAssetClasses(['pricing', 'auctions', 'contracts', 'currency', 'tags'], valuationsConfig.build);
  }

  async clearQueue(): Promise<void> {
    await this.queue.obliterate({ force: true });
  }

  // @Cron(CronExpression.EVERY_10_MINUTES)
  async initValuations(): Promise<void> {
    try {
      await this.RealmModel
        .aggregate<IVARealm>([
          {
            $group: {
              _id: '$connected_realm_id',
              auctions: { $first: "$auctions" },
              valuations: { $first: "$valuations" }
            },
          }
        ])
        .cursor({ batchSize: 1 })
        .eachAsync(async ({ _id, auctions, valuations }: IVARealm) => {
          /** Update valuations with new auctions data */
          if (auctions <= valuations) return;
          await this.buildValuations(_id, auctions);
        });
    } catch (errorOrException) {
      this.logger.error(`initValuations: ${errorOrException}`);
    }
  }

  async buildValuations(connected_realm_id: number, timestamp: number): Promise<void> {
    try {
      for (const [priority, query] of ASSET_EVALUATION_PRIORITY) {
        this.logger.log(`=======================================`);
        this.logger.log(`buildValuations: ${connected_realm_id}-${priority}`);
        await this.ItemModel
          .find(query)
          .lean()
          .cursor()
          .eachAsync(async (item) => {
            const _id = `${item._id}@${connected_realm_id}:${timestamp}`;
            await this.queue.add(
              _id, {
                _id: item._id,
                last_modified: timestamp,
                connected_realm_id,
                iteration: 0
              }, {
                jobId: _id,
                priority: priority,
              }
            );
          }, { parallel: 10 });
        this.logger.log(`=======================================`);
      }
      await this.RealmModel.updateMany({ connected_realm_id }, { valuations: timestamp });
      this.logger.log(`buildValuations: realm: ${connected_realm_id} updated: ${timestamp}`);
    } catch (errorOrException) {
      this.logger.error(`buildValuations: ${errorOrException}`)
    }
  }
  /**
   * TODO add migration stage and replace root
   * @param args
   * @param init
   */
  async buildAssetClasses(args: string[] = ['pricing', 'auctions', 'contracts', 'currency', 'tags'], init: boolean = true): Promise<void> {
    try {
      this.logger.log(`buildAssetClasses: init: ${init}`);
      if (!init) {
        return;
      }
      /**
       * This stage add asset_classes from pricing
       * such as REAGENT / DERIVATIVE
       */
      if (args.includes('pricing')) {
        this.logger.debug('pricing stage started');
        await this.PricingModel
          .find()
          .cursor()
          .eachAsync(async (pricing: Pricing) => {
            for (const { _id } of pricing.derivatives) {
              const item = await this.ItemModel.findById(_id);
              if (item) {
                item.asset_class.addToSet(VALUATION_TYPE.DERIVATIVE);
                this.logger.debug(`item: ${_id}, asset_class: ${VALUATION_TYPE.DERIVATIVE}`);
                await item.save();
              }
            }
            for (const { _id } of pricing.reagents) {
              const item = await this.ItemModel.findById(_id);
              if (item) {
                item.asset_class.addToSet(VALUATION_TYPE.REAGENT);
                this.logger.debug(`item: ${_id}, asset_class: ${VALUATION_TYPE.REAGENT}`);
                await item.save();
              }
            }
          }, { parallel: 20 });
        this.logger.debug('pricing stage ended');
      }
      /**
       * This stage add asset_classes from auction_db
       * such as COMMDTY / ITEM and MARKET
       */
      if (args.includes('auctions')) {
        this.logger.debug('auctions stage started');
        await this.AuctionsModel.aggregate<IVAAuctions>([
          {
            $group: {
              _id: '$item_id',
              data: { $first: "$$ROOT"}
            }
          }
        ])
          .allowDiskUse(true)
          .cursor({})
          .eachAsync(async (itemAuction: IVAAuctions) => {
            const item = await this.ItemModel.findById(itemAuction._id)
            if (item) {
              item.asset_class.addToSet(VALUATION_TYPE.MARKET);
              const { data: order } = itemAuction;
              if (order.price) {
                item.asset_class.addToSet(VALUATION_TYPE.COMMDTY);
                this.logger.debug(`item: ${item._id}, asset_class: ${VALUATION_TYPE.COMMDTY}`);
              } else if (order.bid || order.buyout) {
                item.asset_class.addToSet(VALUATION_TYPE.ITEM);
                this.logger.debug(`item: ${item._id}, asset_class: ${VALUATION_TYPE.ITEM}`);
              }
              await item.save();
            }
          }, { parallel: 20 });
        this.logger.debug('auctions stage ended');
      }
      /**
       * This stage check does item suits the
       * contract criteria based on asset class
       */
      if (args.includes('contracts')) {
        this.logger.debug('contracts stage started');
        await this.ItemModel
          .updateMany({
            $or: [
              { _id: 1 },
              {
                expansion: 'SHDW',
                asset_class: { $all: [VALUATION_TYPE.MARKET, VALUATION_TYPE.COMMDTY] },
                ticker: { $exists: true }
              },
            ],
          }, { contracts: true  });
        this.logger.debug('contracts stage ended');
      }
      /**
       * This stage define to items a special asset_class called PREMIUM
       * based on loot_type and asset_class: REAGENT
       */
      if (args.includes('premium')) {
        this.logger.debug('premium stage started');
        await this.ItemModel
          .updateMany(
            { asset_class: VALUATION_TYPE.REAGENT, loot_type: 'ON_ACQUIRE' },
            { $addToSet: { asset_class: VALUATION_TYPE.PREMIUM } },
          );
        this.logger.debug('premium stage ended');
      }
      /**
       * This stage define CURRENCY and WOWTOKEN
       * asset classes to GOLD / WOWTOKEN
       */
      if (args.includes('currency')) {
        this.logger.debug('currency stage started');
        await this.ItemModel.updateOne(
          { _id: 122270 },
          { $addToSet: { asset_class: VALUATION_TYPE.WOWTOKEN } },
        );
        await this.ItemModel.updateOne(
          { _id: 122284 },
          { $addToSet: { asset_class: VALUATION_TYPE.WOWTOKEN } },
        );
        await this.ItemModel.updateOne(
          { _id: 1 },
          { $addToSet: { asset_class: VALUATION_TYPE.GOLD } },
        );
        this.logger.debug('currency stage ended');
      }
      /**
       * In this stage we build tags
       */
      if (args.includes('tags')) {
        this.logger.debug('tags stage started');
        await this.ItemModel
          .find()
          .cursor()
          .eachAsync(async (item: Item) => {
            if (item.sell_price) item.asset_class.addToSet(VALUATION_TYPE.VSP);
            if (item.expansion) item.tags.addToSet(item.expansion.toLowerCase());
            if (item.profession_class) item.tags.addToSet(item.profession_class.toLowerCase());
            if (item.asset_class) item.asset_class.map(asset_class => item.tags.addToSet(asset_class.toLowerCase()));
            if (item.item_class) item.tags.addToSet(item.item_class.toLowerCase());
            if (item.item_subclass) item.tags.addToSet(item.item_subclass.toLowerCase());
            if (item.quality) item.tags.addToSet(item.quality.toLowerCase());
            if (item.ticker) {
              item.ticker.split('.').map(ticker => {
                const t: string = ticker.toLowerCase()
                if (t === 'j' || t === 'petal' || t === 'nugget') {
                  item.tags.addToSet(t);
                  return;
                }
                item.tags.addToSet(t);
              });
            }
            this.logger.debug(`item: ${item._id}, tags: ${item.tags.join(', ')}`);
            await item.save();
          }, { parallel: 20 });
        this.logger.debug('tags stage ended');
      }
    } catch (errorOrException) {
      this.logger.error(`buildAssetIndex: ${errorOrException}`)
    }
  }
}
