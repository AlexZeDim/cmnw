const valuations_db = require("../../db/valuations_db");
const auctionData = require("../auctions/auctionsData");

async function getMarketData (item_id = 168487, connected_realm_id = 1602, lastModified = '') {
    try {
        let value = await valuations_db.findById(`${item_id}@${connected_realm_id}`).lean();
        if (!value) {
            let [marketData] = await auctionData(item_id, connected_realm_id);
            //TODO create
            console.log(marketData);
        } else {
            /**
             * If exists
             */
        }
    } catch (err) {
        console.error(err);
    }
}

getMarketData();

module.exports = getMarketData;