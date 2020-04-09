const items_db = require("../../db/items_db");
const valuations_db = require("../../db/valuations_db");
const auctions_db = require("../../db/auctions_db");
const {connection} = require('mongoose');

//TODO check asset_class for valuations

async function getValuation (id = 169451) {
    try {
        console.time(`DMA-${getValuation.name}`);
        //TODO find by asset class-etc? distinct?
        let [x] = await valuations_db.find({item_id: id, rank: 3});
        let {reagents, quantity} = x;
        if (reagents.length === quantity.length) {
            //TODO check if reagent demands evaluation
            //TODO if yes check market price
        }
        console.log(x);
        connection.close();
        console.timeEnd(`DMA-${getValuation.name}`);
    } catch (err) {
        console.error(`${getValuation.name},${err}`);
    }
}

getValuation();