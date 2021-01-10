require('../../db/connection')

const moment = require('moment');
const { Round2 } = require('../../db/setters');
const pets_db = require('../../db/models/pets_db');

/**
 *
 * @param connected_realm_id {number}
 * @param timestamp {number=}
 * @param name {string=}
 * @param api {object}
 * @returns {Promise<{orders: [], timestamp: number}>}
 */

const getAuctions = async ({ connected_realm_id, timestamp, name }, api) => {
  const result = {
    orders: [],
    timestamp: 0
  };
  try {
    console.time(`DMA-${getAuctions.name}-${connected_realm_id}:${(name) ? (name) : ('')},${timestamp}`);
    const if_modified_since = `${moment.unix(timestamp).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`

    const orders = await api.query(`/data/wow/connected-realm/${connected_realm_id}/auctions`, {
      timeout: 30000,
      params: { locale: 'en_GB' },
      headers: {
        'Battlenet-Namespace': 'dynamic-eu',
        'If-Modified-Since': if_modified_since
      }
    })
    if (!orders || !Array.isArray(orders.auctions) || !orders.auctions.length) return result

    result.timestamp = moment(orders.lastModified).format('X')

    result.orders = await Promise.all(orders.auctions.map(async order => {
      if (order.item) {
        /** Pet fix */
        if (order.item.id && order.item.id === 82800) {
          if (order.item.modifiers && order.item.modifiers.length) {
            const display_id = order.item.modifiers.find(m => m.type === 6);
            if (display_id && display_id.value) {
              const pet = await pets_db.findOne({ display_id: display_id.value }).lean()
              if (pet && pet.item_id) order.item.id = pet.item_id
            }
          }
        }
      }
      if (order.bid) order.bid = Round2(order.bid / 10000);
      if (order.buyout) order.buyout = Round2(order.buyout / 10000);
      if (order.unit_price) order.unit_price = Round2(order.unit_price / 10000);
      order.connected_realm_id = connected_realm_id;
      order.last_modified = result.timestamp;
      return order
    }))

    return result
  } catch (error) {
    console.error(`E,${getAuctions.name}-${connected_realm_id}:${(name) ? (name) : ('')}:${error}`)
    return result
  } finally {
    console.timeEnd(`DMA-${getAuctions.name}-${connected_realm_id}:${(name) ? (name) : ('')},${timestamp}`)
  }
}

module.exports = { getAuctions };
