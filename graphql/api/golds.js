

/**
 * Model importing
 */
require('../../db/connection')
const auctions_db = require('../../db/models/auctions_db');

/**
 * Modules
 */
const { differenceBy } = require('lodash');

(async function T () {
  try {
    const timestamps = await auctions_db.find({ 'connected_realm_id': 1602 }).distinct('last_modified')
    if (timestamps.length < 2) {
      return
    }
    timestamps.sort((a, b) => b - a)

    const [ t0, t1 ] = timestamps;
    const [ orders_t0, orders_t1 ] = await Promise.all([
      auctions_db.find({ 'connected_realm_id': 1602, 'last_modified': t0, 'item.id': 168487 }).lean(),
      auctions_db.find({ 'connected_realm_id': 1602, 'last_modified': t1, 'item.id': 168487 }).lean()
    ])
    if (!orders_t0.length || !orders_t1.length) {
      return
    }
    const test0 = differenceBy(orders_t0, orders_t1, 'id')
    const test1 = differenceBy(orders_t1, orders_t0, 'id')
    console.log(test0, test1)
  } catch (e) {
    console.error(e)
  }
})();

