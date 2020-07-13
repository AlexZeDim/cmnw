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

const wowtoken_db = require("../db/wowtoken_db");
const keys_db = require("../db/keys_db");

/**
 * Modules
 */

const battleNetWrapper = require('battlenet-api-wrapper');
const {Round2} = require("../db/setters")

/**
 * @param queryKeys
 * @returns {Promise<void>}
 */

async function getWoWTokenData (queryKeys = { tags: `DMA` }) {
    try {
        console.time(`DMA-${getWoWTokenData.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        const { last_updated_timestamp, price, lastModified, statusCode } = await bnw.WowGameData.getWowTokenIndex();
        const wt = await wowtoken_db.findOne({region: 'eu'}).sort('-lastModified');
        if (statusCode === 200) {
            let wowtoken = new wowtoken_db({
                _id: last_updated_timestamp,
                region: 'eu',
                price: Round2(price/10000),
                lastModified: lastModified
            });
            if (wt) {
                console.log(last_updated_timestamp, wt._id)
                if (last_updated_timestamp > wt._id) {
                    await wowtoken.save()
                }
            } else {
                await wowtoken.save()
            }
        }
        await connection.close();
        console.timeEnd(`DMA-${getWoWTokenData.name}`);
    } catch (err) {
        await connection.close();
        console.error(`${getWoWTokenData.name},${err}`);
    }
}

getWoWTokenData();