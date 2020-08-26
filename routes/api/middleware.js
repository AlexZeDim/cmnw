/**
 * Model importing
 */

const items_db = require('../../db/items_db');
const realms_db = require('../../db/realms_db');

/**
 *
 * @param itemQuery
 * @param realmQuery
 * @returns {Promise<[{_id: number, asset_class: array, stackable: number},{connected_realm_id: number, auctions: number}]>}
 * @constructor
 */
const queryItemAndRealm = async (itemQuery, realmQuery) => {
  try {
    let item, realm;

    if (itemQuery) {
      if (isNaN(itemQuery)) {
        item = items_db
          .findOne(
            { $text: { $search: itemQuery } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean();
      } else {
        item = items_db.findById(parseInt(itemQuery)).lean();
      }
    }

    if (realmQuery) {
      if (isNaN(realmQuery)) {
        realm = realms_db
          .findOne(
            { $text: { $search: realmQuery } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean();
      } else {
        realm = realms_db.findById(parseInt(realmQuery)).lean();
      }
    }

    return await Promise.all([await item, await realm]);
  } catch (error) {
    console.error(error);
    return void 0;
  }
};

module.exports = queryItemAndRealm;
