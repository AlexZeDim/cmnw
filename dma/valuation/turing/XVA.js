const items_db = require("../../../db/items_db");
const itemValuationAdjustment = require('./IVA');
const {connection} = require('mongoose');


async function XVA () {
    try {
        console.time(`DMA-${XVA.name}`); //v_class: ['REAGENT', 'MARKET', 'DERIVATIVE'], profession_class: "INSC",
        let cursor = await items_db.find({expansion: "BFA", _id: 169449}).limit(10).cursor({batchSize: 10});
        cursor.on('data', async item_ => {
            cursor.pause();
            await itemValuationAdjustment(item_, 1602);
            cursor.resume();
        });
        cursor.on('error', error => {
            console.error(`E,DMA-${XVA.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            connection.close();
            console.timeEnd(`DMA-${XVA.name}`);
        });
    } catch (err) {
        console.error(`${XVA.name},${err}`);
    }
}

XVA();

module.exports = XVA;