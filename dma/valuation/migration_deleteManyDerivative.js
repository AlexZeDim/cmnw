const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

/***
 * TODO as migrations
 * @returns {Promise<void>}
 */

async function migrations() {
    try {
        let d = await pricing_methods.deleteMany({ type: "derivative"});
        console.info(d);
        connection.close();
    } catch (err) {
        console.error(err);
    }
}

migrations();