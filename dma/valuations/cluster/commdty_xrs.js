/**
 * Model importing
 */
const auctions_db = require('../../../db/models/auctions_db');

/**
 *
 * @param y_axis {[number]}
 * @param item_id {number}
 * @param realm {{ x: number, connected_realm_id: number, auctions: number }}
 * @returns {Promise<[{ x: number, y: number, orders: number, value: number, oi: number}]>}
 */

async function commdtyXRS (y_axis = [], item_id = 168487, realm = {}) {
  try {
    const chart = [];
    if (!y_axis.length) return chart;
    if (!('x' in realm) || !realm.connected_realm_id || !realm.auctions) return chart;
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
          x: realm.x,
          y: y_index,
          orders: order.orders,
          value: order.value,
          oi: parseInt(order.oi)
        })
      } else if (order._id === 'Other') {
        chart.push({
          x: realm.x,
          y: y_axis.length-1,
          orders: order.orders,
          value: order.value,
          oi: parseInt(order.oi)
        })
      }
    }
    return chart
  } catch (error) {
    console.error(error)
    return []
  }
}

module.exports = commdtyXRS;
