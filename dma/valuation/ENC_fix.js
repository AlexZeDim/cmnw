const pricing_db = require("../../db/pricing_db");

async function test () {
    try {
        let enc = await pricing_db.updateMany({item_quantity: 0}, { item_quantity: 1 });
        console.log(enc);
    } catch (err) {
        console.log(err);
    }
}

test();