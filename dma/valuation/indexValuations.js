const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const valuations_db = require("../../db/valuations_db");
//const getPricing = require("./getValuation");
const getPricingMethods = require("./getPricingMethods");
const getSyntheticMethods = require("./getSyntheticMethods");
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
/*        let [auction_house, valuation] = await Promise.all([
            auctions_db.findOne({connected_realm_id: 1602}, {_id: 0, lastModified: 1}).sort('-lastModified'),
            valuations_db.findOne({connected_realm_id: 1602}, {_id: 0, lastModified: 1}).sort('-lastModified')
        ]);
        if (auction_house) auction_house = new Date(auction_house.lastModified);
        if (valuation) valuation = new Date(valuation.lastModified);
        if (auction_house > valuation) {

        }*/
        //TODO cursor
        let cursor = await items_db.find({ticker: "VANTUS.NYA"}).cursor({batchSize: 1});
        cursor.on('data', async item => {
            /**
             * If lastModified (auctions) found then go to pricing method as one
             */
            let primary_methods = await getPricingMethods(item._id, false);
            let test = await getSyntheticMethods(primary_methods);
            for (let x of test) {
                console.log(x);
            }
        });
        console.timeEnd(indexValuations.name);
    } catch (err) {
        console.log(err);
    }
}

indexValuations();