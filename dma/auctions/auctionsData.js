const auctions_db = require("../../db/auctions_db");
const realms_db = require("../../db/realms_db");

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<{quantity: number, min: number, open_interest: number, min_size: number, orders: [], _id: number}[]|*>}
 */

async function auctionsData (item_id = 168487, connected_realm_id = 1602) {
    try {
        const t = await realms_db.findOne({ connected_realm_id: connected_realm_id }).select('auctions').lean();
        if (t) {
            return await auctions_db.aggregate([
                {
                    $match: {
                        last_modified: t.auctions,
                        "item.id": item_id,
                        connected_realm_id: connected_realm_id,
                    }
                },
                {
                    $project: {
                        _id: "$last_modified",
                        id: "$id",
                        quantity: "$quantity",
                        price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        quantity: {$sum: "$quantity"},
                        open_interest: {$sum: { $multiply: [ "$price", "$quantity" ] }},
                        min: {$min: "$price"},
                        min_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                        orders: {$addToSet: "$id"},
                    }
                }
            ]);
        } else {
            return [{
                _id: item_id,
                quantity: 0,
                open_interest: 0,
                min: 0,
                min_size: 0,
                orders: []
            }]
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsData;