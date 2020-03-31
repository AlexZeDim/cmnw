const auctions_db = require("../../db/auctions_db");

async function auctionsData (item_id = 168487, connected_realm_id = 1602) {
    try {
        const {lastModified} = await auctions_db.findOne({ "item.id": item_id, connected_realm_id: connected_realm_id}).sort({lastModified: -1});
        return await auctions_db.aggregate([
            {
                $match: {
                    lastModified: lastModified,
                    "item.id": item_id,
                    connected_realm_id: connected_realm_id,
                }
            },
            {
                $project: {
                    _id: "$lastModified",
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
    } catch (error) {
        console.error(error)
    }
}

module.exports = auctionsData;