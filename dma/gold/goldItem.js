const items_db = require("../../db/items_db");
const {connection} = require('mongoose');

async function goldItem () {
    try {
        console.time(`DMA-${goldItem.name}`);
        await items_db.create({
            _id: 1,
            name: {en_GB: 'Gold'},
            ticker: 'GOLD',
            asset_class: "CURRENCY",
        }).then(i => console.info(`C,${i._id}`)).catch(e=>(e));
        connection.close();
        console.timeEnd(`DMA-${goldItem.name}`);
    } catch (err) {
        console.error(`${goldItem.name},${err}`);
    }
}

goldItem();