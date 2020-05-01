const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');

/***
 * TODO as migrations
 * @returns {Promise<void>}
 */

async function fixQntyENCT() {
    try {
        let fix = await professions_db.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 });
        console.info(fix);
        connection.close();
    } catch (err) {
        console.error(err);
    }
}

fixQntyENCT();