/**
 * Mongo Models
 */
require('../../db/connection')
const items_db = require('../../db/models/items_db');
const realms_db = require('../../db/models/realms_db');
const auctions_db = require('../../db/models/auctions_db');
const golds_db = require('../../db/models/golds_db');
const contracts_db = require('../../db/models/contracts_db');

/**
 * Modules
 */
const schedule = require('node-schedule');
const moment = require('moment');

/**
 *
 * @param parallel {number}
 * @returns {Promise<void>}
 */
const indexContracts = async (parallel = 2) => {
  console.time(`DMA-${indexContracts.name}`);
  try {

    const db = {};

    const date = {
      d: moment().get('date'),
      w: moment().get('week'),
      m: moment().get('month') + 1,
      y: moment().get('year')
    }

    await items_db
      .find({ contracts: true })
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(async item => {

        if ('ticker' in item) {
          item.contract_name = item.ticker
        } else if ('name' in item && item.name.en_GB) {
          item.contract_name = item.name.en_GB
        }

        if (!'stackable' in item) {
          if ('asset_class' in item) {
            if (item.asset_class.includes('COMMDTY')) {
              item.stackable = 200;
            }
          }
        }

        if (item._id === 1) {
          db.Model = golds_db;
          db.Query = [
            {
              $match: {
                createdAt: {
                  $gt: moment.utc().subtract(1, 'day').toDate(),
                },
                status: 'Online',
              },
            },
            {
              $group: {
                _id: {
                  connected_realm_id: '$connected_realm_id',
                  last_modified: '$last_modified',
                },
                open_interest: {
                  $sum: {
                    $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                  },
                },
                quantity: { $sum: '$quantity' },
                price: { $min: '$price' },
                price_size_array: {
                  $addToSet: {
                    $cond: {
                      if: { $gte: ['$quantity', 1000000] },
                      then: '$price',
                      else: "$$REMOVE"
                    }
                  }
                },
                sellers: { $addToSet: '$owner' },
              },
            },
            {
              $project: {
                connected_realm_id: '$_id.connected_realm_id',
                last_modified: '$_id.last_modified',
                price: '$price',
                price_size: {
                  $cond: {
                    if: { $gte: [{$size: "$price_size_array"}, 1] },
                    then: { $min: '$price_size_array' },
                    else: "$price"
                  }
                },
                quantity: '$quantity',
                open_interest: '$open_interest',
                sellers: '$sellers',
              },
            },
            {
              $addFields: {
                _id: {
                  $concat: [
                    '1-',
                    {
                      $convert: {
                        input: '$_id.last_modified',
                        to: 'string',
                      },
                    },
                    '@',
                    {
                      $convert: {
                        input: '$_id.connected_realm_id',
                        to: 'string',
                      },
                    },
                  ],
                },
                item_id: 1,
                date: {
                  day: date.d,
                  week: date.w,
                  month: date.m,
                  year: date.y,
                },
              },
            },
          ]
        } else {

          const { auctions } = await realms_db.findOne({ region: 'Europe' }).lean().select('auctions').sort({ 'auctions': 1 });

          db.Model = auctions_db;
          db.Query = [
            {
              $match: {
                'last_modified': { $gte: auctions - (60 * 60 * 3) },
                'item.id': item._id,
              },
            },
            {
              $group: {
                _id: {
                  item_id: '$item.id',
                  connected_realm_id: '$connected_realm_id',
                  last_modified: '$last_modified',
                },
                open_interest: {
                  $sum: {
                    $multiply: ['$unit_price', '$quantity'],
                  },
                },
                quantity: { $sum: '$quantity' },
                price: { $min: '$unit_price' },
                price_size_array: {
                  $addToSet: {
                    $cond: {
                      if: { $gte: ['$quantity', item.stackable || 1] },
                      then: '$unit_price',
                      else: "$$REMOVE"
                    }
                  }
                },
                orders: {
                  $push: {
                    id: '$id',
                    time_left: '$time_left',
                  },
                },
              },
            },
            {
              $project: {
                item_id: '$_id.item_id',
                connected_realm_id: '$_id.connected_realm_id',
                last_modified: '$_id.last_modified',
                price: '$price',
                price_size: {
                  $cond: {
                    if: { $gte: [{$size: "$price_size_array"}, 1] },
                    then: { $min: '$price_size_array' },
                    else: "$price"
                  }
                },
                quantity: '$quantity',
                open_interest: '$open_interest',
                orders: '$orders',
              },
            },
            {
              $addFields: {
                _id: {
                  $concat: [
                    {
                      $convert: {
                        input: '$_id.item_id',
                        to: 'string',
                      },
                    },
                    '-',
                    {
                      $convert: {
                        input: '$_id.last_modified',
                        to: 'string',
                      },
                    },
                    '@',
                    {
                      $convert: {
                        input: '$_id.connected_realm_id',
                        to: 'string',
                      },
                    },
                  ],
                },
                date: {
                  day: date.d,
                  week: date.w,
                  month: date.m,
                  year: date.y,
                },
              },
            },
          ]
        }

        await db.Model.aggregate(db.Query)
          .allowDiskUse(true)
          .cursor()
          .exec()
          .eachAsync(async contract => {
            const flag = await contracts_db.findById(contract._id);
            if (!flag) await contracts_db.create(contract);
            console.info(`${(flag) ? ('E') : ('C')},${('contract_name' in item) ? (`${item.contract_name}:`) : ('')}${contract._id}:${moment().format('DD.MMM.WW.YY')}`);
          }, { parallel: parallel })
      });
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-${indexContracts.name}`);
    process.exit(0)
  }
}

schedule.scheduleJob('00 10,18 * * *', () => {
  indexContracts(2).then(r => r)
})
