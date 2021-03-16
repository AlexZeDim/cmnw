import '../db/mongo/mongo.connection';
import {ItemModel, AuctionsModel, PricingModel} from "../db/mongo/mongo.model";

const build = async (args: string[]): Promise<void> => {
  try {

    /**
     * This stage add asset_classes from pricing
     * such as REAGENT / DERIVATIVE
     */
    if (args.includes('pricing')) {
      await PricingModel.find().cursor().eachAsync(async pricing => {
        for (const { _id } of pricing.derivatives) {
          const item = await ItemModel.findById(_id);
          if (item) {
            item.asset_class.addToSet('DERIVATIVE');
            await item.save();
          }
        }
        for (const { _id } of pricing.reagents) {
          const item = await ItemModel.findById(_id);
          if (item) {
            item.asset_class.addToSet('REAGENT');
            await item.save();
          }
        }
      })
    }
    /**
     * This stage add asset_classes from auction_db
     * such as COMMDTY / ITEM and MARKET
     */
    if (args.includes('auctions')) {
      await AuctionsModel.aggregate([
        {
          $group: {
            _id: '$item_id',
            data: { $first: "$$ROOT"}
          }
        },
        //TODO only item_id project state?
      ])
        .allowDiskUse(true)
        .cursor({})
        .exec()
        .eachAsync(async (order: any) => {
          const item = await ItemModel.findById(order._id)
          if (item) {
            item.asset_class.addToSet('MARKET');
            if (order.data.unit_price) {
              item.asset_class.addToSet('COMMDTY');
            } else if (order.data.bid || order.data.buyout) {
              item.asset_class.addToSet('ITEM');
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
      await ItemModel.updateMany({}, { contracts: false });
      await ItemModel.updateMany({
        $or: [
          { _id: 1 },
          {
            expansion: 'SHDW',
            asset_class: { $all: ['MARKET', 'COMMDTY'] },
            ticker: { $exists: true }
          },
        ],
      }, { contracts: true  });
    }
    /**
     * This stage define to items a special asset_class called PREMIUM
     * based on loot_type and asset_class: REAGENT
     */
    if (args.includes('premium')) {
      await ItemModel.updateMany(
        { asset_class: 'REAGENT', loot_type: 'ON_ACQUIRE' },
        { $addToSet: { asset_class: 'PREMIUM' } },
      )
    }
    /**
     * This stage define CURRENCY and WOWTOKEN
     * asset classes to GOLD / WOWTOKEN
     */
    if (args.includes('currency')) {
      await ItemModel.updateOne(
        { _id: 122270 },
        { $addToSet: { asset_class: 'WOWTOKEN' } },
      );
      await ItemModel.updateOne(
        { _id: 122284 },
        { $addToSet: { asset_class: 'WOWTOKEN' } },
      );
      await ItemModel.updateOne(
        { _id: 1 },
        { $addToSet: { asset_class: 'GOLD' } },
      );
    }
    /**
     * In this stage we build tags
     */
    if (args.includes('tags')) {
      await ItemModel
        .find()
        .cursor()
        .eachAsync(async item => {
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
                return
              }
              item.tags.addToSet(t)
            })
          }
        })
    }
  } catch (e) {
    console.error(e)
  }
}

build(['pricing', 'auctions', 'contracts', 'currency', 'tags']).catch()
