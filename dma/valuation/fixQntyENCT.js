const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');


async function fixQntyENCT() {
    try {
        let fix = await professions_db.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 })
        console.log(fix);
    } catch (err) {
        console.log(err);
    }
}

fixQntyENCT();