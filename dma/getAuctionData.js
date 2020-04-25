const keys_db = require("./../db/keys_db");
const realms_db = require("./../db/realms_db");
const auctions_db = require("./../db/auctions_db");
const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');
const {connection} = require('mongoose');

async function getAuctionData (queryKeys = { tags: `DMA` }, realmQuery = { 'locale': 'ru_RU' }) {
    try {
        console.time(`DMA-${getAuctionData.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        let realms = await realms_db.find(realmQuery).cursor({batchSize: 1});
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            console.info(`R,${realm.connected_realm_id}:${realm.name}`);
            let header_lastModified = '';
            let {connected_realm_id} = realm;
            const latest_lot = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified');
            if (latest_lot) header_lastModified = `${moment(latest_lot.lastModified).format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
            let {auctions, lastModified} = await bnw.WowGameData.getAuctionHouse(connected_realm_id, header_lastModified);
            if (auctions) {
                for (let i = 0; i < auctions.length; i++) {
                    if ("bid" in auctions[i]) auctions[i].bid = parseFloat((auctions[i].bid/10000).toFixed(2));
                    if ("buyout" in auctions[i]) auctions[i].buyout = parseFloat((auctions[i].buyout/10000).toFixed(2));
                    if ("unit_price" in auctions[i]) auctions[i].unit_price = parseFloat((auctions[i].unit_price/10000).toFixed(2));
                    auctions[i].connected_realm_id = connected_realm_id;
                    auctions[i].lastModified = moment(lastModified).format();
                }
                await auctions_db.insertMany(auctions).then(auctions => console.info(`U,${realm.name},${auctions.length}`))
            }
        }
        connection.close();
        console.timeEnd(`DMA-${getAuctionData.name}`);
    } catch (err) {
        console.error(`${getAuctionData.name},${err}`);
    }
}

getAuctionData();