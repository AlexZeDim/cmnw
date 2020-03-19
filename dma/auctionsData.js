const auctions_db = require("../db/auctions_db");

async function auctionsData (item_id = 152510, connected_realm_id = 1602) {
    try {
        const {lastModified} = await auctions_db.findOne({ "item.id": item_id, connected_realm_id: connected_realm_id}).sort({lastModified: -1});
        let test = await auctions_db.aggregate([
            {
                $match: {
                    lastModified: lastModified,
                    "item.id": item_id,
                    connected_realm_id: connected_realm_id,
                }
            },
            {
                $group: {
                    _id: "$lastModified",
                    open_interest: { $cond: [{ "$eq": [ "$buyout", null ] }, {$sum: { $multiply: [ "$unit_price", "$quantity" ] }}, {$sum: "$buyout"} ] },
/*                    quantity: {$sum: "$quantity"},
                    min: {$min: "$price"},
                    min_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", "$min:$price"]}},
                    avg: {$avg: "$price"},
                    max: {$max: "$price"},
                    max_size: {$max: {$cond: [{$gte: ["$quantity", 200]}, "$price", "$max:$price"]}},
                    cp: {$addToSet: "$owner"},*/
                }
            }]);
        console.log(test)
    } catch (error) {

    }
}

auctionsData();