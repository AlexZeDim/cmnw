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
const valuations_db = require("./../db/valuations_db");

/**
 * B.net wrapper
 */
const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const moment = require('moment');
const XVA = require('./valuation/turing/XVA')

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param queryKeys
 * @param realmQuery
 * @param bulkSize
 * @returns {Promise<void>}
 */

async function getValuationsData (queryKeys = { tags: `DMA` }, realmQuery = { 'locale': 'ru_RU' }, bulkSize = 10) {
    try {
        console.time(`DMA-${getValuationsData.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        await realms_db.aggregate([
            {
                $match: realmQuery
            },
            {
                $group: {
                    _id: "$connected_realm_id"
                }
            }
        ]).cursor({batchSize: 10}).exec().eachAsync(async ({_id}) => {
            let [latest_lot, latest_value] = await Promise.all([
                await auctions_db.findOne({connected_realm_id: _id}).select('lastModified').sort('-lastModified'),
                await valuations_db.findOne({connected_realm_id: _id}).select('lastModified').sort('-lastModified')
            ])
            if (moment(latest_lot.lastModified).isAfter(latest_value.lastModified)) {
                await XVA({expansion: "BFA"}, _id)
            }
        }, {parallel: bulkSize});
        connection.close();
        console.timeEnd(`DMA-${getValuationsData.name}`);
    } catch (err) {
        console.error(`${getValuationsData.name},${err}`);
    }
}

getValuationsData();