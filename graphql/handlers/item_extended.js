const realms_db = require('../../db/models/realms_db');
const valuations_db = require('../../db/models/valuations_db');
const auctions_db = require('../../db/models/auctions_db');
const golds_db = require('../../db/models/golds_db');

const evaluate = require('../../dma/valuations/eva/evaluate');
const buildY = require('../../dma/valuations/cluster/build_y');
const commdtyXRS = require('../../dma/valuations/cluster/commdty_xrs')
const commdtyTS = require('../../dma/valuations/cluster/commdty_ts')
const goldXRS = require('../../dma/valuations/cluster/gold_xrs')
const goldTS = require('../../dma/valuations/cluster/gold_ts')

/**
 *
 * @param item {{ _id: number, asset_class: [string], stackable: number }}
 * @param connected_realms_id {[number]}
 * @param extended {Boolean}
 * @returns {Promise<{feed: [], valuations: [], chart: {y_axis: [], x_axis: [], dataset: []}, quotes: []}>}
 */

async function itemExtended (item, connected_realms_id = [], extended = false) {
  const extended_params = {
    valuations: [],
    chart: {
      y_axis: [],
      x_axis: [],
      dataset: []
    },
    quotes: [],
    feed: []
  }

  if (!connected_realms_id.length) return extended_params
  if (!item._id) return extended_params

  try {
    let is_commdty = false, is_xrs = false, is_gold = false, y_axis = [];
    if (extended) {
      /** COMMDTY block */


      if (item.asset_class && item.asset_class.includes('COMMDTY')) {
        is_commdty = true;
      }
      if (item.stackable && item.stackable > 1) {
        is_commdty = true;
      }
      if (item._id === 1) {
        is_commdty = true;
      }

      /** XRS */
      is_xrs = connected_realms_id.length !== 1;
      is_gold = item._id === 1;

      /** Request Y axis for cluster  */
      y_axis = await buildY(item._id, connected_realms_id, is_commdty, is_xrs, is_gold)
      extended_params.chart.y_axis.push(...y_axis)
    }


    /** For each realm */
    await realms_db
      .aggregate([
        {
          $match: { connected_realm_id: { $in: connected_realms_id } }
        },
        {
          $group: {
            _id: "$connected_realm_id",
            realms: { $addToSet: "$name_locale" },
            connected_realm_id: { $first: "$connected_realm_id" },
            auctions: { $first: "$auctions" },
            golds: { $first: "$golds" },
            valuations: { $first: "$valuations" }
          }
        }
      ])
      .allowDiskUse(true)
      .cursor()
      .exec()
      .eachAsync(async (realm, x) => {
        /**
         *  =Valuations Thread=>
         * TODO Promise.all & force evaluation
         */
        const valuation = await valuations_db.findOne({
          item_id: item._id,
          last_modified: realm.valuations,
          connected_realm_id: realm.connected_realm_id,
          $nor: [{ type: 'VENDOR' }, { type: 'VSP' }],
        }).sort({ value: 1 }).lean()
        if (!valuation) {
          const iva = {...item}
          iva.connected_realm_id = realm.connected_realm_id;
          iva.last_modified = realm.auctions;
          iva.iteration = 0;
          await evaluate(iva)
        }
        const valuations = await valuations_db.find({
          item_id: item._id,
          last_modified: realm.valuations,
          connected_realm_id: realm.connected_realm_id,
        }).sort({ value: 1 }).lean()
        extended_params.valuations.push(...valuations)

        if (extended) {
          /** =Chart Data Thread=> */
          if (is_commdty) {
            if (is_xrs) {
              /** Build X axis */
              extended_params.chart.x_axis.push(realm.realms.join(', '))
              /** Build Cluster from Orders */
              if (is_gold) {
                const dataset = await goldXRS(y_axis, { x: x, connected_realm_id: realm.connected_realm_id, golds: realm.golds })
                if (dataset && dataset.length) {
                  extended_params.chart.dataset.push(...dataset);
                }
              }

              if (!is_gold) {
                const dataset = await commdtyXRS(y_axis, item._id, { x: x, connected_realm_id: realm.connected_realm_id, auctions: realm.auctions })
                if (dataset && dataset.length) {
                  extended_params.chart.dataset.push(...dataset);
                }
              }
            }

            if (!is_xrs) {
              /** Build Cluster by Timestamp */
              if (is_gold) {
                const [ dataset, xAxis ] = await goldTS(y_axis, realm.connected_realm_id)
                if (dataset && xAxis) {
                  extended_params.chart.dataset.push(...dataset);
                  extended_params.chart.x_axis.push(...xAxis);
                }
              }

              if (!is_gold) {
                const [ dataset, xAxis ] = await commdtyTS(y_axis, item._id, realm.connected_realm_id)
                if (dataset && xAxis) {
                  extended_params.chart.dataset.push(...dataset);
                  extended_params.chart.x_axis.push(...xAxis);
                }
              }
            }
          }

          /** =Feed Thread=> */
          if (!is_commdty && !is_gold) {
            /** Create Feed from Orders */
            const feed = await auctions_db.find({
              'last_modified': realm.auctions,
              'item.id': item._id,
              'connected_realm_id': realm.connected_realm_id,
            })
            if (feed && feed.length) {
              extended_params.feed.push(...feed)
            }
          }

          /** =Quotes Thread=> */
          if (!is_xrs) {
            if (is_gold) {
              const quotes = await golds_db.aggregate([
                {
                  $match: {
                    status: 'Online',
                    connected_realm_id: realm.connected_realm_id,
                    last_modified: realm.golds,
                  },
                },
                {
                  $project: {
                    id: '$id',
                    quantity: '$quantity',
                    price: '$price',
                    owner: '$owner',
                  },
                },
                {
                  $group: {
                    _id: '$price',
                    quantity: { $sum: '$quantity' },
                    open_interest: {
                      $sum: {
                        $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                      },
                    },
                    sellers: { $addToSet: '$owner' },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
                {
                  $project: {
                    _id: 0,
                    price: '$_id',
                    quantity: '$quantity',
                    open_interest: '$open_interest',
                    size: {
                      $cond: {
                        if: { $isArray: '$sellers' },
                        then: { $size: '$sellers' },
                        else: 0,
                      },
                    },
                  },
                },
              ])
              if (quotes && quotes.length) {
                Object.assign(extended_params, { quotes: quotes })
              }
            }

            if (!is_gold) {
              const quotes = await auctions_db.aggregate([
                {
                  $match: {
                    'last_modified': realm.auctions,
                    'item.id': item._id,
                    'connected_realm_id': realm.connected_realm_id,
                  },
                },
                {
                  $project: {
                    id: '$id',
                    quantity: '$quantity',
                    price: {
                      $ifNull: ['$buyout', { $ifNull: ['$bid', '$unit_price'] }],
                    },
                  },
                },
                {
                  $group: {
                    _id: '$price',
                    quantity: { $sum: '$quantity' },
                    open_interest: {
                      $sum: { $multiply: ['$price', '$quantity'] },
                    },
                    orders: { $addToSet: '$id' },
                  },
                },
                {
                  $sort: { _id: 1 },
                },
                {
                  $project: {
                    _id: 0,
                    price: '$_id',
                    quantity: '$quantity',
                    open_interest: '$open_interest',
                    size: {
                      $cond: {
                        if: { $isArray: '$orders' },
                        then: { $size: '$orders' },
                        else: 0,
                      },
                    },
                  },
                },
              ])
              if (quotes && quotes.length) {
                Object.assign(extended_params, { quotes: quotes })
              }
            }
          }
        }
      }, { parallel: 20 })
    return extended_params
  } catch (e) {
    console.error(e)
    return extended_params
  }
}

module.exports = itemExtended;
