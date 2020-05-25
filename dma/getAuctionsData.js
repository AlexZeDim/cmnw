/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const keys_db = require("./../db/keys_db");
const realms_db = require("./../db/realms_db");
const auctions_db = require("./../db/auctions_db");

/**
 * B.net wrapper
 */
const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const moment = require('moment');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param queryKeys
 * @param realmQuery
 * @returns {Promise<void>}
 */

async function getAuctionData (queryKeys = { tags: `DMA` }, realmQuery = { 'locale': 'ru_RU' }) {
    try {
        console.time(`DMA-${getAuctionData.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        const realms = await realms_db.find(realmQuery).distinct('connected_realm_id');
        for (let connected_realm_id of realms) {
            console.info(`R,${connected_realm_id}`);
            /**
             * If-Modified-Since header for Blizzard API
             * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since
             */
            let header_lastModified = '';
            const latest_lot = await auctions_db.findOne({connected_realm_id: connected_realm_id}).sort('-lastModified');
            if (latest_lot) header_lastModified = `${moment(latest_lot.lastModified).format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
            let {auctions, lastModified} = await bnw.WowGameData.getAuctionHouse(connected_realm_id, header_lastModified).catch(e=> {console.info(`E,${connected_realm_id}:${e}`); return (e)});
            if (auctions && auctions.length) {
                for (let i = 0; i < auctions.length; i++) {
                    if ("bid" in auctions[i]) auctions[i].bid = parseFloat((auctions[i].bid/10000).toFixed(2));
                    if ("buyout" in auctions[i]) auctions[i].buyout = parseFloat((auctions[i].buyout/10000).toFixed(2));
                    if ("unit_price" in auctions[i]) auctions[i].unit_price = parseFloat((auctions[i].unit_price/10000).toFixed(2));
                    auctions[i].connected_realm_id = connected_realm_id;
                    auctions[i].lastModified = moment(lastModified).toISOString(true);
                }
                await auctions_db.insertMany(auctions).then(auctions => {
                    console.info(`U,${auctions.length}`)
                    /**
                     * Launch evaluation process (XVA) as a separate task in PM2
                     */
                    const pm2 = require('pm2');
                    const path = require('path');
                    pm2.connect(function(err) {
                        if (err) {
                            console.error(err);
                        }
                        pm2.start({
                            name: `DMA-XVA-${connected_realm_id}`,
                            args: `connected_realm_id ${connected_realm_id}`,
                            script: `${path.dirname(require.main.filename) + '/valuation/turing/XVA.js'}`,
                            exec_mode: 'fork',
                            instances: 1,
                            autorestart: false,
                        }, function(err, apps) {
                            pm2.disconnect();
                            if (err) throw err
                        });
                    });
                })
            }
        }
        connection.close();
        console.timeEnd(`DMA-${getAuctionData.name}`);
    } catch (err) {
        console.error(`${getAuctionData.name},${err}`);
    }
}

getAuctionData();