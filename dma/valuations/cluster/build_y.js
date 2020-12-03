const priceRange = require('./price_range');
const auctions_db = require('../../../db/models/auctions_db');
const realms_db = require('../../../db/models/realms_db');
const golds_db = require('../../../db/models/golds_db');

/**
 *
 * @param item_id {number}
 * @param connected_realms_id {[number]}
 * @param is_commdty {Boolean}
 * @param is_xrs {Boolean}
 * @param is_gold {boolean}
 * @returns {Promise<[number]|*[]>}
 */

async function buildY (item_id, connected_realms_id = [], is_commdty = false, is_xrs = false, is_gold = false) {
  try {
    /**
     * Control price level
     * if XRS => 40
     * else => 20
     */
    let y_axis = [], blocks = 20;
    if (!connected_realms_id || !connected_realms_id.length) return y_axis
    if (!is_commdty) return y_axis

    if (is_xrs) blocks = 40;

    /** Request oldest from latest timestamp */
    if (is_gold && is_xrs) {
      const { golds } = await realms_db.findOne({ connected_realm_id: { $in: connected_realms_id } }).lean().select('golds').sort({ 'golds': 1 })
      const quotes = await golds_db.find({ 'last_modified': { $gte: golds }, connected_realm_id: { $in: connected_realms_id } }, 'price').distinct('price');
      return await priceRange(quotes, blocks)
    }

    if (is_gold && !is_xrs) {
      const quotes = await golds_db.find({ connected_realm_id: { $in: connected_realms_id } }, 'price').distinct('price');
      return await priceRange(quotes, blocks)
    }

    if (!is_gold && is_xrs) {
      const { auctions } = await realms_db.findOne({ connected_realm_id: { $in: connected_realms_id } }).lean().select('auctions').sort({ 'auctions': 1 })
      /** Find distinct prices for each realm */
      const quotes = await auctions_db.find({ 'last_modified': { $gte: auctions }, 'item.id': item_id, connected_realm_id: { $in: connected_realms_id } }, 'unit_price').distinct('unit_price');
      return await priceRange(quotes, blocks)
    }

    if (!is_gold && !is_xrs) {
      /** Find distinct prices for each realm */
      const quotes = await auctions_db.find({ 'item.id': item_id, connected_realm_id: { $in: connected_realms_id } }, 'unit_price').distinct('unit_price');
      return await priceRange(quotes, blocks)
    }

  } catch (e) {
    console.error(e)
    return []
  }
}

module.exports = buildY;
