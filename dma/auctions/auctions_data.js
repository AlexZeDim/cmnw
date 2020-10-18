const auctions_db = require('../../db/models/auctions_db');
const realms_db = require('../../db/models/realms_db');

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<*>}
 */

async function auctionsData (item_id = 168487, connected_realm_id = 1602) {
  try {
    const t = await realms_db
      .findOne({ connected_realm_id: connected_realm_id })
      .select('auctions')
      .lean();
    if (t) {
      return await auctions_db.aggregate([
        {
          $match: {
            last_modified: t.auctions,
            'item.id': item_id,
            connected_realm_id: connected_realm_id,
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
      ]);
    } else {
      return void 0;
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = auctionsData;
