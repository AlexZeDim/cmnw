/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const items_db = require('../../db/items_db');
const auctions_db = require('../../db/auctions_db');
const pricing_methods_db = require('../../db/pricing_methods_db');

/**
 * indexItems add is_auction, is_commdty and is_derivative properties to items
 * @param arg
 * @param bulkSize
 * @returns {Promise<void>}
 */

async function indexAssetClass(arg = 'pricing_methods', bulkSize = 10) {
  try {
    console.time(`DMA-${indexAssetClass.name}`);
    switch (arg) {
      case 'pricing_methods':
        console.info(`Stage: pricing methods`);
        console.time(`Stage: pricing methods`);
        await pricing_methods_db
          .find({})
          .limit(100)
          .cursor({ batchSize: bulkSize })
          .eachAsync(
            async method => {
              try {
                /** Derivative Asset Class */
                if (method.item_id) {
                  let item = await items_db.findById(method.item_id);
                  if (item.asset_class) {
                    item.asset_class.addToSet('DERIVATIVE');
                    await item.save();
                    console.info(`${item._id}, ${item.asset_class.toString()}`);
                  }
                }
                if (method.alliance_item_id) {
                  console.log();
                  let item = await items_db.findById(method.alliance_item_id);
                  if (item) {
                    item.asset_class.addToSet('DERIVATIVE');
                    await item.save();
                    console.info(`${item._id}, ${item.asset_class.toString()}`);
                  }
                }
                if (method.horde_item_id) {
                  let item = await items_db.findById(method.horde_item_id);
                  if (item) {
                    item.asset_class.addToSet('DERIVATIVE');
                    await item.save();
                    console.info(`${item._id}, ${item.asset_class.toString()}`);
                  }
                }
                /** Reagent Asset Class */
                if (method.reagents && method.reagents.length) {
                  for (let { _id } of method.reagents) {
                    let item = await items_db.findById(_id);
                    if (item) {
                      item.asset_class.addToSet('REAGENT');
                      await item.save();
                      console.info(
                        `${item._id}, ${item.asset_class.toString()}`,
                      );
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
      case 'auctions':
        console.info(`Stage: auctions`);
        console.time(`Stage: auctions`);
        await auctions_db
          .aggregate([
            {
              $group: {
                _id: {
                  id: '$item.id',
                  is_commdty: {
                    $ifNull: ['$unit_price', false],
                  },
                },
              },
            },
            {
              $project: {
                _id: '$_id.id',
                is_commdty: {
                  $cond: [{ $eq: ['$_id.is_commdty', false] }, false, true],
                },
              },
            },
          ])
          .cursor({ batchSize: bulkSize })
          .exec()
          .eachAsync(
            async ({ _id, is_commdty }) => {
              let item = await items_db.findById(_id);
              if (item) {
                if (is_commdty) {
                  item.asset_class.addToSet('COMMDTY');
                } else {
                  item.asset_class.addToSet('ITEM');
                }
                item.asset_class.addToSet('MARKET');
                await item.save();
                console.info(`${item._id}, ${item.asset_class.toString()}`);
              }
            },
            { parallel: bulkSize },
          );
        console.timeEnd(`Stage: auctions`);
      case 'contracts':
        console.info(`Stage: contracts`);
        console.time(`Stage: contracts`);
        await items_db.updateMany({}, { contracts: false });
        await items_db.updateMany(
          {
            $or: [
              { _id: 1 },
              {
                expansion: 'BFA',
                asset_class: { $all: ['MARKET', 'COMMDTY'] },
              },
            ],
          },
          { contracts: true },
        );
        console.timeEnd(`Stage: contracts`);
      case 'items':
        console.info(`Stage: items`);
        console.time(`Stage: items`);
        await items_db.updateMany(
          { asset_class: 'REAGENT', loot_type: 'ON_ACQUIRE' },
          { $addToSet: { asset_class: 'PREMIUM' } },
        );
        console.timeEnd(`Stage: items`);
        break;
      case 'currency':
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
          { $addToSet: { asset_class: 'CURRENCY' } },
        );
        console.timeEnd(`Stage: currency`);
        break;
      default:
        break;
    }
    connection.close();
    console.timeEnd(`DMA-${indexAssetClass.name}`);
  } catch (err) {
    console.error(`${indexAssetClass.name},${err}`);
  }
}

indexAssetClass(process.argv.slice(2)[0], process.argv.slice(2)[1]);
