import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Auction, Item, Key, Pricing } from '@app/mongo';
import { Model } from "mongoose";
import { VALUATION_TYPE } from '@app/core';

@Injectable()
export class ValuationsService {
  private readonly logger = new Logger(
    ValuationsService.name, true,
  );

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Item.name)
    private readonly ItemModel: Model<Item>,
    @InjectModel(Pricing.name)
    private readonly PricingModel: Model<Pricing>,
    @InjectModel(Auction.name)
    private readonly AuctionsModel: Model<Auction>,
  ) {
    // TODO valuations
    this.buildAssetClasses(['pricing', 'auctions', 'contracts', 'currency', 'tags'], true)
  }

  async buildAssetClasses(args: string[], init: boolean = false): Promise<void> {
    try {
      if (!init) {
        this.logger.log(`buildAssetClasses: init: ${init}`);
        return;
      }
      /**
       * This stage add asset_classes from pricing
       * such as REAGENT / DERIVATIVE
       */
      if (args.includes('pricing')) {
        await this.PricingModel
          .find()
          .cursor()
          .eachAsync(async (pricing: Pricing) => {
            for (const { _id } of pricing.derivatives) {
              const item = await this.ItemModel.findById(_id);
              if (item) {
                item.asset_class.addToSet(VALUATION_TYPE.DERIVATIVE);
                await item.save();
              }
            }
            for (const { _id } of pricing.reagents) {
              const item = await this.ItemModel.findById(_id);
              if (item) {
                item.asset_class.addToSet(VALUATION_TYPE.REAGENT);
                await item.save();
              }
            }
          });
      }
      /**
       * This stage add asset_classes from auction_db
       * such as COMMDTY / ITEM and MARKET
       */
      if (args.includes('auctions')) {
        await this.AuctionsModel.aggregate([
          {
            $group: {
              _id: '$item_id',
              data: { $first: "$$ROOT"}
            }
          },
          {
            $project: {
              item_id: 1
            }
          }
        ])
          .allowDiskUse(true)
          .cursor({})
          .exec()
          .eachAsync(async (order: any) => {
            const item = await this.ItemModel.findById(order._id)
            if (item) {
              item.asset_class.addToSet(VALUATION_TYPE.MARKET);
              if (order.data.unit_price) {
                item.asset_class.addToSet(VALUATION_TYPE.COMMDTY);
              } else if (order.data.bid || order.data.buyout) {
                item.asset_class.addToSet(VALUATION_TYPE.ITEM);
              }
              await item.save();
            }
          })
      }
      /**
       * This stage check does item suits the
       * contract criteria based on asset class
       */
      if (args.includes('contracts')) {
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
          }, { contracts: true  })
      }
      /**
       * This stage define to items a special asset_class called PREMIUM
       * based on loot_type and asset_class: REAGENT
       */
      if (args.includes('premium')) {
        await this.ItemModel
          .updateMany(
            { asset_class: VALUATION_TYPE.REAGENT, loot_type: 'ON_ACQUIRE' },
            { $addToSet: { asset_class: VALUATION_TYPE.PREMIUM } },
          )
      }
      /**
       * This stage define CURRENCY and WOWTOKEN
       * asset classes to GOLD / WOWTOKEN
       */
      if (args.includes('currency')) {
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
      }
      /**
       * In this stage we build tags
       */
      if (args.includes('tags')) {
        await this.ItemModel
          .find()
          .cursor()
          .eachAsync(async (item: Item) => {
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
              })
            }
            await item.save();
          });
      }
    } catch (e) {
      this.logger.error(`buildAssetIndex: ${e}`)
    }
  }
}
