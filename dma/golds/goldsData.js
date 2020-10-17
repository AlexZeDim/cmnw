const golds_db = require('../../db/models/golds_db');
const realms_db = require('../../db/models/realms_db');

/**
 * @param connected_realm_id
 * @returns {Promise<*>}
 */

async function goldsQuotes(connected_realm_id = 1602) {
  try {
    const t = await realms_db
      .findOne({ connected_realm_id: connected_realm_id })
      .select('golds')
      .lean();
    if (t) {
      return await golds_db.aggregate([
        {
          $match: {
            status: 'Online',
            connected_realm_id: connected_realm_id,
            last_modified: t.golds,
          },
        },
        {
          $project: {
            id: '$id',
            quantity: '$quantity',
            price: '$price',
            owner: '$owner',
          },
        },
        {
          $group: {
            _id: '$price',
            quantity: { $sum: '$quantity' },
            open_interest: {
              $sum: {
                $multiply: ['$price', { $divide: ['$quantity', 1000] }],
              },
            },
            sellers: { $addToSet: '$owner' },
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
                if: { $isArray: '$sellers' },
                then: { $size: '$sellers' },
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

module.exports = goldsQuotes;
