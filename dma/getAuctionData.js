const keys_db = require("./../db/keys_db");
const realms_db = require("./../db/realms_db");
const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getAuctionHouse (queryKeys = { tags: `Depo` }, realmArg = 'Gordunni') {
    try {
        const { token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let realms = await realms_db.find({$or: [
                { 'name': realmArg },
                { 'name_locale': realmArg },
            ]}).cursor();
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            let {connected_realm_id} = realm;
            let auctionHouse = await bnw.WowGameData.getAuctionHouse(connected_realm_id);
            let {auctions, lastModified} = auctionHouse;
            console.info(auctions);
            console.info(moment(lastModified).format());
        }
    } catch (err) {
        console.error(err);
    }
}

getAuctionHouse();