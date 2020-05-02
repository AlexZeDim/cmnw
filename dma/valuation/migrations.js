const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

/***
 * TODO as migrations
 * @returns {Promise<void>}
 */

async function migrations() {
    try {
        let encn = await pricing_methods.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 });
        console.info(encn);
        connection.close();
    } catch (err) {
        console.error(err);
    }
}

migrations();