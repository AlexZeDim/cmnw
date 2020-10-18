const auctions_db = require('../../db/models/auctions_db');
const realms_db = require('../../db/models/realms_db');

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<{quantity: number, min: number, open_interest: number, min_size: number, orders: [], _id: number}>}
 */

async function auctionsQuotes (item_id = 168487, connected_realm_id = 1602) {
  const empty = {
    _id: item_id,
    quantity: 0,
    open_interest: 0,
    min: 0,
    min_size: 0,
    orders: [],
  };
  try {
    const t = await realms_db
      .findOne({ connected_realm_id: connected_realm_id })
      .select('auctions')
      .lean();
    if (t) {
      return await auctions_db
        .aggregate([
          {
            $match: {
              last_modified: t.auctions,
              'item.id': item_id,
              connected_realm_id: connected_realm_id,
            },
          },
          {
            $project: {
              _id: '$last_modified',
              id: '$id',
              quantity: '$quantity',
              price: {
                $ifNull: ['$buyout', { $ifNull: ['$bid', '$unit_price'] }],
              },
            },
          },
          {
            $group: {
              _id: '$_id',
              quantity: { $sum: '$quantity' },
              open_interest: {
                $sum: { $multiply: ['$price', '$quantity'] },
              },
              min: { $min: '$price' },
              min_size: {
                $min: {
                  $cond: [
                    { $gte: ['$quantity', 200] },
                    '$price',
                    { $min: '$price' },
                  ],
                },
              },
              orders: { $addToSet: '$id' },
            },
          },
        ])
        .then(result => {
          if (result.length) {
            return result[0];
          } else {
            return empty;
          }
        })
        .catch(error => {
          console.error(error);
          return empty;
        });
    } else {
      return empty;
    }
  } catch (error) {
    console.error(error);
    return empty;
  }
}

module.exports = auctionsQuotes;
