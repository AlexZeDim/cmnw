const auctions_db = require("../../db/auctions_db");

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<*>}
 */

async function auctionsQuotes (item_id = 168487, connected_realm_id = 1602) {
    try {
        const t = await auctions_db.findOne({ "item.id": item_id, connected_realm_id: connected_realm_id}).select('lastModified').lean().sort({lastModified: -1});
        if (t) {
            return await auctions_db.aggregate([
                {
                    $match: {
                        lastModified: t.lastModified,
                        "item.id": item_id,
                        connected_realm_id: connected_realm_id,
                    }
                },
                {
                    $project: {
                        id: "$id",
                        quantity: "$quantity",
                        price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                    }
                },
                {
                    $group: {
                        _id: "$price",
                        quantity: {$sum: "$quantity"},
                        open_interest: {$sum: { $multiply: [ "$price", "$quantity" ] }},
                        orders: {$addToSet: "$id"},
                    }
                },
                {
                    $sort : { "_id": 1 }
                }
            ]);
        } else {
            return void 0
        }
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsQuotes;