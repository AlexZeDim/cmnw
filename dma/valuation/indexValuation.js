const items_db = require("../../db/items_db");
const getPricing = require("./getPricing");

/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuation () {
    try {
        console.time(indexValuation.name);
        //TODO cursor
        let items = await items_db.find({ticker: "J.POTION.REJUV"});
        for (let item of items) {
            let x = await getPricing(item, 1602, true);
            console.log(x);
            console.log(x.model);
            console.log(x.model.valuations[0].pricing_method);
        }
        console.timeEnd(indexValuation.name);
    } catch (err) {
        console.log(err);
    }
}

indexValuation();