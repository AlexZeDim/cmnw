/**
 * Mongo Models
 */
require('../../db/connection')
const items_db = require('../../db/models/items_db');
const auctions_db = require('../../db/models/auctions_db');
const pricing_methods_db = require('../../db/models/pricing_methods_db');

/**
 * Modules
 */

const schedule = require('node-schedule');

/**
 * This function build evaluations asset classes for items
 * @param args {string}
 * @returns {Promise<void>}
 */

const buildAssetClass = async (...args) => {
  try {
    console.time(`DMA-${buildAssetClass.name}`);
    const bulkSize = 10;

    /**
     * This stage add asset_classes from pricing_methods
     * such as REAGENT / DERIVATIVE
     */
    if (args.includes('pricing_methods')) {
      console.info(`Stage: pricing methods`);
      console.time(`Stage: pricing methods`);
      await pricing_methods_db
        .find()
        .cursor({ batchSize: bulkSize })
        .eachAsync(
          async method => {
            try {
              /** Derivative Asset Class */
              if (method.derivatives) {
                for (let { _id } of method.derivatives) {
                  const item = await items_db.findById(_id);
                  if (item && item.asset_class) {
                    item.asset_class.addToSet('DERIVATIVE');
                    await item.save();
                    console.info(`${item._id},${item.asset_class.toString()}`);
                  }
                }
              }
              /** Reagent Asset Class */
              if (method.reagents && method.reagents.length) {
                for (let { _id } of method.reagents) {
                  const item = await items_db.findById(_id);
                  if (item && item.asset_class) {
                    item.asset_class.addToSet('REAGENT');
                    await item.save();
                    console.info(`${item._id},${item.asset_class.toString()}`);
                  }
                }
              }
            } catch (e) {
              console.error(e);
            }
          },
          { parallel: bulkSize },
        );
      console.timeEnd(`Stage: pricing methods`);
    }

    /**
     * This stage add asset_classes from auction_db
     * such as COMMDTY / ITEM and MARKET
     */
    if (args.includes('auctions')) {
      console.info(`Stage: auctions`);
      console.time(`Stage: auctions`);

      await auctions_db.aggregate([
        {
          $group: {
            _id: '$item.id',
            data: { $first: "$$ROOT"}
          }
        }
      ])
        .allowDiskUse(true)
        .cursor()
        .exec()
        .eachAsync(async ({ _id, data }) => {
          const item = await items_db.findById(_id)
          if (item) {
            item.asset_class.addToSet('MARKET');
            if (data.unit_price) {
              item.asset_class.addToSet('COMMDTY');
            } else if (data.buyout || data.bid) {
              item.asset_class.addToSet('ITEM');
            }
            console.info(`${item._id},${item.asset_class.toString()}`);
            await item.save()
          }
        }, { parallel: bulkSize })
      console.timeEnd(`Stage: auctions`);
    }

    /**
     * This stage check does item suits the
     * contract criteria based on asset class
     */
    if (args.includes('contracts')) {
      console.info(`Stage: contracts`);
      console.time(`Stage: contracts`);
      await items_db.updateMany({}, { contracts: false });
      await items_db.updateMany(
        {
          $or: [
            { _id: 1 },
            {
              expansion: 'SHDW',
              asset_class: { $all: ['MARKET', 'COMMDTY'] },
              ticker: { $exists: true }
            },
          ],
        },
        { contracts: true },
      );
      console.timeEnd(`Stage: contracts`);
    }

    /**
     * This stage define to items a special asset_class called PREMIUM
     * based on loot_type and asset_class: REAGENT
     */
    if (args.includes('premium')) {
      console.info(`Stage: premium`);
      console.time(`Stage: premium`);
      await items_db.updateMany(
        { asset_class: 'REAGENT', loot_type: 'ON_ACQUIRE' },
        { $addToSet: { asset_class: 'PREMIUM' } },
      );
      console.timeEnd(`Stage: premium`);
    }

    /**
     * This stage define CURRENCY and WOWTOKEN asset classes to GOLD / WOWTOKEN
     */
    if (args.includes('currency')) {
      console.info(`Stage: currency`);
      console.time(`Stage: currency`);
      await items_db.updateOne(
        { _id: 122270 },
        { $addToSet: { asset_class: 'WOWTOKEN' } },
      );
      await items_db.updateOne(
        { _id: 122284 },
        { $addToSet: { asset_class: 'WOWTOKEN' } },
      );
      await items_db.updateOne(
        { _id: 1 },
        { $addToSet: { asset_class: 'GOLD' } },
      );
      console.timeEnd(`Stage: currency`);
    }

    if (args.includes('tags')) {
      console.info(`Stage: tags`);
      console.time(`Stage: tags`);
      const fields = ['expansion', 'ticker', 'profession_class', 'asset_class', 'item_class', 'item_subclass', 'quality']
      await items_db
        .find()
        .cursor({ batchSize: bulkSize })
        .eachAsync(
          async (item) => {
            for (let field of fields) {
              if (item[field]) {
                if (Array.isArray(item[field])) {
                  item[field].map(as => item.tags.addToSet(as.toLowerCase()))
                } else {
                  if (field === 'ticker') {
                    item[field].split('.').map(t => {
                      t = t.toLowerCase();
                      if (t === 'j' || t === 'petal' || t === 'nugget') {
                        item.tags.addToSet('junior')
                      }
                      item.tags.addToSet(t)
                    })
                  } else {
                    item.tags.addToSet(item[field].toLowerCase())
                  }
                }
              }
            }
            await item.save()
            console.info(`${item._id},tags build: ${item.tags.join()}`)
          },
          { parallel: bulkSize },
        )
      console.timeEnd(`Stage: tags`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-${buildAssetClass.name}`);
    process.exit(0)
  }
}


schedule.scheduleJob('00 12 * * *',  function () {
  buildAssetClass('pricing_methods', 'auctions', 'contracts', 'currency', 'tags').then(r => r);
})

