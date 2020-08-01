const golds_db = require("../../db/golds_db");

/**
 * @param connected_realm_id
 * @returns {Promise<*>}
 */

async function goldsQuotes (connected_realm_id = 1602) {
    try {
        const t = await golds_db.findOne({ connected_realm_id: connected_realm_id}).select('last_modified').lean().sort({last_modified: -1});
        if (t) {
            return await golds_db.aggregate([
                {
                    $match: {
                        status: "Online",
                        connected_realm_id: connected_realm_id,
                        last_modified: t.last_modified,
                    }
                },
                {
                    $project: {
                        id: "$id",
                        quantity: "$quantity",
                        price: "$price",
                    }
                },
                {
                    $group: {
                        _id: "$price",
                        quantity: {$sum: "$quantity"},
                        open_interest: {$sum: { $multiply: [ "$price", "$quantity" ] }},
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

module.exports = goldsQuotes;