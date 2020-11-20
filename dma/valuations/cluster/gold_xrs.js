/**
 * Model importing
 */
const golds_db = require('../../../db/models/golds_db');

/**
 *
 * @param y_axis {[number]}
 * @param realm {{ x: number, connected_realm_id: number, golds: number }}
 * @returns {Promise<[{ x: number, y: number, orders: number, value: number, oi: number}]>}
 */

async function goldXRS (y_axis = [], realm = {}) {
  try {
    const chart = [];
    if (!y_axis.length) return chart
    if (!('x' in realm) || !realm.connected_realm_id || !realm.golds) return chart
    /** Build Chart from Orders */
    const orders = await golds_db
      .aggregate([
        {
          $match: {
            'status': 'Online',
            'connected_realm_id': realm.connected_realm_id,
            'last_modified': { $eq: realm.golds },
          },
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
                $sum: { $multiply: ['$price', { $divide: [ "$quantity", 1000 ] }] },
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

module.exports = goldXRS;
