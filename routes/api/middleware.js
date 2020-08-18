/**
 * Model importing
 */

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");

/**
 *
 * @param item
 * @param realm
 * @returns {Promise<[{_id: number, asset_class: array, stackable: number},{connected_realm_id: number, auctions: number}]>}
 * @constructor
 */
const itemRealmQuery = async (item, realm) => {
    try {

        let itemQuery, realmQuery;

        if (isNaN(item)) {
            itemQuery = items_db.findOne({ $text: { $search: item }}, { score: {"$meta": "textScore"}}).sort({ score: { $meta: "textScore" } }).lean();
        } else {
            itemQuery = items_db.findById(parseInt(item)).lean();
        }

        if (isNaN(realm)) {
            realmQuery = realms_db.findOne({ $text: { $search: realm } }, { score: {"$meta": "textScore"}}).sort({ score: { $meta: "textScore" } }).lean();
        } else {
            realmQuery = realms_db.findById(parseInt(realm)).lean();
        }

        return await Promise.all([
            await itemQuery,
            await realmQuery
        ])

    } catch (error) {
        console.error(error);
        return void 0
    }
}

module.exports = itemRealmQuery;