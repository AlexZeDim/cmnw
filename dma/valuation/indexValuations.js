const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const valuations_db = require("../../db/valuations_db");
const getPricing = require("./getValuation");
const {connection} = require('mongoose');

/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuations () {
    try {
        console.time(indexValuations.name);
        /**
         * Distinct values of realms
         */
        let [auction_house, valuation] = await Promise.all([
            auctions_db.findOne({connected_realm_id: 1602}, {_id: 0, lastModified: 1}).sort('-lastModified'),
            valuations_db.findOne({connected_realm_id: 1602}, {_id: 0, lastModified: 1}).sort('-lastModified')
        ]);
        if (auction_house) auction_house = new Date(auction_house.lastModified);
        if (valuation) valuation = new Date(valuation.lastModified);
        if (auction_house > valuation) {

        }
        //TODO cursor
        let items = await items_db.find({ticker: "ALCH.CAULDRON"});
        for (let item of items) {
            let x = await getPricing(item, 1602);
            console.log(x);
        }
        console.timeEnd(indexValuations.name);
    } catch (err) {
        console.log(err);
    }
}

indexValuations();