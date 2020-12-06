/**
 * Model importing
 */

const items_db = require('../../db/models/items_db');
const realms_db = require('../../db/models/realms_db');

/**
 *
 * @param itemQuery { string || number }
 * @param realmQuery { string || number }
 * @returns {Promise<[{_id: number, asset_class: array, stackable: number},[{connected_realm_id: number, auctions: number, golds: number}]]>}
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
      const realm = realmQuery.split(';').filter(value => value !== '');
      /** findOne or find */
      if (realm.length === 1) {
        if (isNaN(realmQuery)) {
          /** if string */
          array.push(
            realms_db
              .find(
                { $text: { $search: realmQuery } },
                { score: { $meta: 'textScore' } },
              )
              .sort({ score: { $meta: 'textScore' } })
              .limit(1)
              .lean()
          )
        } else {
          /** if number */
          array.push(realms_db.find({ connected_realm_id: parseInt(realmQuery) }).limit(1).lean())
        }
      } else {
        array.push(
          realms_db
            .find(
              { $text: { $search: realm.toString().replace(';', ' ') } },
              { score: { $meta: 'textScore' } },
            )
            .sort({ score: { $meta: 'textScore' } })
            .lean()
        )
      }
    }

    return await Promise.all(array);
  } catch (error) {
    console.error(error);
  }
};

module.exports = queryItemAndRealm;
