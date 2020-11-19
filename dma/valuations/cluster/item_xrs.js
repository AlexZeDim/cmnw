/**
 * Model importing
 */
const auctions_db = require('../../../db/models/auctions_db');
const realms_db = require('../../../db/models/realms_db');
const valuations_db = require('../../../db/models/valuations_db');
const priceRange = require('./price_range')

/**
 * @param item_id
 * @returns {Promise<*>}
 */

async function itemXRS (item_id = 168487) {
  try {
    const valuations_xrs = [];

    /** Request oldest from latest timestamp */
    const { auctions } = await realms_db.findOne().lean().select('auctions').sort({ 'auctions': 1 })

    /** Find distinct prices for each realm */
    const quotes = await auctions_db.find({ 'last_modified': { $gte: auctions }, 'item.id': item_id }, 'unit_price').distinct('unit_price');
    /** Control price level */
    const y_axis = priceRange(quotes)
    const x_axis = [];
    const chart = [];

    await realms_db
      .aggregate([
        {
          $group: {
            _id: "$connected_realm_id",
            realms: { $addToSet: "$name_locale" },
            connected_realm_id: { $first: "$connected_realm_id" },
            auctions: { $first: "$auctions" },
            valuations: { $first: "$valuations" }
          }
        }
      ])
      .allowDiskUse(true)
      .cursor()
      .exec()
      .eachAsync(async (realm, x) => {
        /** Valuations */
        const valuations = await valuations_db.find({
          item_id: item_id,
          last_modified: realm.valuations,
          $nor: [{ type: 'VENDOR' }, { type: 'VSP' }],
        }).sort({ value: 1})
        /**
         * TODO force valuations
         * with spread operator
         * and Promise.all
         */
        for (const valuation of valuations) {
          valuations_xrs.push(valuation)
        }
        /** Build X axis */
        x_axis.push(realm.realms.join(', '))
        /** Build Chart from Orders */
        const orders = await auctions_db
          .aggregate([
            {
              $match: {
                'connected_realm_id': realm.connected_realm_id,
                'last_modified': { $eq: realm.auctions },
                'item.id': item_id
              },
            },
            {
              $bucket: {
                groupBy: "$unit_price",
                boundaries: y_axis,
                default: "Other",
                output: {
                  orders: { $sum: 1 },
                  value: { $sum: "$quantity" },
                  oi: {
                    $sum: { $multiply: ['$unit_price', '$quantity'] },
                  }
                }
              }
            },
          ])
          .allowDiskUse(true)
        for (const order of orders) {
          const y_index = y_axis.findIndex((el) => el === order._id)
          if (y_index !== -1) {
            chart.push({
              x: x,
              y: y_index,
              orders: order.orders,
              value: order.value,
              oi: order.oi
            })
          } else if (order._id === 'Other') {
            chart.push({
              x: x,
              y: y_axis[y_axis.length-1],
              orders: order.orders,
              value: order.value,
              oi: order.oi
            })
          }
        }
      }, { parallel: 20 })
    return {
      valuations: valuations_xrs,
      y_axis: y_axis,
      x_axis: x_axis,
      dataset: chart
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = itemXRS;
