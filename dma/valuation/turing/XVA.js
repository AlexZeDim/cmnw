const items_db = require("../../../db/items_db");
const itemValuationAdjustment = require('./IVA');
const {connection} = require('mongoose');


async function XVA () {
    try {
        //console.time(`DMA-${XVA.name}`); //v_class: ['REAGENT', 'MARKET', 'DERIVATIVE'], profession_class: "INSC",

        /**
         * Asset Class hierarchy map
         * @type {Map<string, number>}
         */
        let query = {expansion: "BFA"};

        const assetClassMap = new Map([
            [0, ['VENDOR','REAGENT','ITEM']],
            [1, ['CONST','REAGENT','ITEM']],
            [2, ['PREMIUM','REAGENT','DERIVATIVE']],
            [3, ['PREMIUM','MARKET','ITEM']],
            [4, ['PREMIUM','REAGENT','ITEM']],
            [5, ['REAGENT','MARKET','ITEM']],
            [6, ['REAGENT','MARKET','DERIVATIVE']],
            [7, ['CAP','MARKET','DERIVATIVE']],
            [8, ['CAP','PREMIUM','DERIVATIVE']],
        ]);

        for (let kv of assetClassMap) {
            Object.assign(query, {v_classs: kv[1]})
            console.log(query);
            let test = await items_db.find({expansion: "BFA", v_class: ['REAGENT','MARKET','DERIVATIVE']}).limit(10);
            console.log(test);
        }

        let cursor = await items_db.find({expansion: "BFA", _id: 152668}).limit(10).cursor({batchSize: 10});
        cursor.on('data', async item_ => {
            cursor.pause();
            let x = await itemValuationAdjustment(item_, 1602);
            console.log(x);
            cursor.resume();
        });
        cursor.on('error', error => {
            console.error(`E,DMA-${XVA.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 600000));
            connection.close();
            console.timeEnd(`DMA-${XVA.name}`);
        });
    } catch (err) {
        console.error(`${XVA.name},${err}`);
    }
}

XVA();

module.exports = XVA;