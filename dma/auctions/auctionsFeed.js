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

const auctions_db = require("../../db/auctions_db");

/**
 *
 * TODO from item lookup by name
 * TODO from item lookup by realms (connected)
 *
 * @param item_id {Number}
 * @param connected_realm_id {Number}
 * @returns {Promise<void>}
 */

async function auctionsFeed (item_id = 168487, connected_realm_id) {
    try {
        /** If connected realm exists then another $match stage */
        if (connected_realm_id) {

        }
        const item = await auctions_db.aggregate([
            {
                $match: {
                    'item.id': item_id
                }
            },
            {
                $limit: 100
            }
        ])
        console.log(item)
    } catch (e) {

    }
}

auctionsFeed();
