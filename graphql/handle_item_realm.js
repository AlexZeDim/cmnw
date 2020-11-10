/**
 * Model importing
 */

const items_db = require('../db/models/items_db');
const realms_db = require('../db/models/realms_db');

/**
 *
 * @param itemQuery
 * @param realmQuery
 * @returns {Promise<[{_id: number, asset_class: array, stackable: number},{connected_realm_id: number, auctions: number, golds: number}]>}
 * @constructor
 */
const queryItemAndRealm = async (itemQuery, realmQuery) => {
  try {
    const array = [];

    if (itemQuery) {
      if (isNaN(itemQuery)) {
        array.push(
          items_db
            .findOne(
              { $text: { $search: itemQuery } },
              { score: { $meta: 'textScore' } },
            )
            .sort({ score: { $meta: 'textScore' } })
            .lean()
        )
      } else {
        array.push(items_db.findById(parseInt(itemQuery)).lean())
      }
    }

    if (realmQuery) {
      if (isNaN(realmQuery)) {
        array.push(
          realms_db
            .findOne(
              { $text: { $search: realmQuery } },
              { score: { $meta: 'textScore' } },
            )
            .sort({ score: { $meta: 'textScore' } })
            .lean()
        )
      } else {
        array.push(realms_db.findById(parseInt(realmQuery)).lean())
      }
    }

    return await Promise.all(array);
  } catch (error) {
    console.error(error);
  }
};

module.exports = queryItemAndRealm;
