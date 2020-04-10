const items_db = require("../../db/items_db");
const getPricing = require("./getPricing");

/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuation () {
    try {
        let items = await items_db.find({ticker:/FOOD.VERS/}).limit(2);
        for (let item of items) {
            let x = await getPricing(item, 1602);
            console.log(x.cheapest_to_delivery);
        }
    } catch (err) {
        console.log(err);
    }
}

indexValuation();