const items_db = require("../../db/items_db");
const getPricing = require("./getValuation");

/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuations () {
    try {
        console.time(indexValuations.name);
        const latest_lot = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified');
        //TODO cursor
        let items = await items_db.find({ticker: "ALCH.CAULDRON"});
        for (let item of items) {
            let x = await getPricing(item, 1602, true);
            console.log(x);
        }
        console.timeEnd(indexValuations.name);
    } catch (err) {
        console.log(err);
    }
}

indexValuations();