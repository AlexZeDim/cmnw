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

const keys_db = require("../../db/keys_db");
const items_db = require("../../db/items_db");


/**
 * Modules
 */
const getItem = require("./getItem");

/**
 * This function parse items across B.net API with wrapper
 * @param queryKeys {object}
 * @param update {boolean}
 * @returns {Promise<void>}
 */

async function indexItems (queryKeys = { tags: `DMA` }, update = true) {
    try {
        console.time(`DMA-${indexItems.name}`);

        const { token } = await keys_db.findOne(queryKeys);

        if (update) {
            await items_db.find({}).lean().cursor({batchSize: 10}).eachAsync(async ({_id}) => {
                await getItem(_id, token)
            }, { parallel: 10 })
        } else {
            for (let _id = 25; _id < 230000; _id++) {
                await getItem(_id, token)
            }
        }
        /**
         * TODO After updateMany purchase_price/purchase_quantity
         */
        connection.close();
        console.timeEnd(`DMA-${indexItems.name}`);
    } catch (err) {
        console.error(`${indexItems.name},${err}`);
    }
}

indexItems({ tags: `DMA` }, true);