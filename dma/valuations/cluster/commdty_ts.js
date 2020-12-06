/**
 * Model importing
 */
const auctions_db = require('../../../db/models/auctions_db');

/**
 *
 * @param y_axis {[number]}
 * @param item_id {number}
 * @param connected_realm_id {number}
 * @returns {Promise<[]|([]|*)[]>}
 */

async function commdtyTS (y_axis = [], item_id = 168487, connected_realm_id = 1604) {
  try {
    const chart = [];
    if (!y_axis.length) return chart
    if (!connected_realm_id) return chart
    /** Find distinct timestamps for each realm */
    const timestamps = await auctions_db.find({ 'item.id': item_id, connected_realm_id: connected_realm_id }, 'last_modified').hint({ 'item.id': -1, connected_realm_id: 1 }).distinct('last_modified');
    timestamps.sort((a, b) => a - b)
    await Promise.all(timestamps.map(async (timestamp, i) => {
      await auctions_db.aggregate([
        {
          $match: {
            'last_modified': timestamp,
            'item.id': item_id,
            'connected_realm_id': connected_realm_id
          }
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
    }));
    return [ chart, timestamps ]
  } catch (error) {
    console.error(error)
    return []
  }
}

module.exports = commdtyTS;
