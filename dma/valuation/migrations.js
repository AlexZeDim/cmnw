const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');

/***
 * TODO as migrations
 * @returns {Promise<void>}
 */

async function migrations() {
    try {
        let encn = await professions_db.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 });
        console.info(encn);
        let type_added = await professions_db.updateMany({},{
            type: 'primary',
            createdBy: 'DMA-indexProfessions',
            updatedBy: 'DMA-indexProfessions'
        });
        console.info(type_added);
        connection.close();
    } catch (err) {
        console.error(err);
    }
}

migrations();