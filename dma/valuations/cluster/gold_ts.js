/**
 * Model importing
 */
const golds_db = require('../../../db/models/golds_db');

/**
 *
 * @param y_axis {[number]}
 * @param connected_realm_id {number}
 * @returns {Promise<[]|([]|*)[]>}
 */

async function goldTS (y_axis = [], connected_realm_id = 1604) {
  try {
    const chart = [];
    if (!y_axis.length) return chart
    if (!connected_realm_id) return chart

    /** Find distinct timestamps for each realm */
    const timestamps = await golds_db.find({ connected_realm_id: connected_realm_id }, 'last_modified').distinct('last_modified');
    timestamps.sort((a, b) => a - b)

    for (let i = 0; i < timestamps.length; i++) {
      await golds_db.aggregate([
        {
          $match: {
            'status': 'Online',
            'connected_realm_id': connected_realm_id,
            'last_modified': timestamps[i]
          }
        },
        {
          $bucket: {
            groupBy: "$price",
            boundaries: y_axis,
            default: "Other",
            output: {
              orders: { $sum: 1 },
              value: { $sum: "$quantity" },
              oi: {
                $sum: { $multiply: ['$unit_price', { $divide: [ "$quantity", 1000 ] }] },
              }
            }
          }
        },
        {
          $addFields: { x: i }
        }
      ])
        .allowDiskUse(true)
        .cursor()
        .exec()
        .eachAsync(async (order) => {
          const y_index = y_axis.findIndex((el) => el === order._id)
          if (y_index !== -1) {
            chart.push({
              x: order.x,
              y: y_index,
              orders: order.orders,
              value: order.value,
              oi: order.oi
            })
          } else if (order._id === 'Other') {
            chart.push({
              x: order.x,
              y: y_axis.length-1,
              orders: order.orders,
              value: order.value,
              oi: order.oi
            })
          }
        }, { parallel: 20 })
    }
    return [ chart, timestamps ]
  } catch (error) {
    console.error(error)
    return []
  }
}

module.exports = goldTS;
