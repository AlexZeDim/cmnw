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
const realms_db = require("../../db/realms_db");

/**
 * @param item_id
 * @param connected_realm_id
 * @returns {Promise<{quantity: number, min: number, open_interest: number, min_size: number, orders: [], _id: number}[]|*>}
 */

async function auctionsData (item_id = 168487) {
    try {
/*        const t = await realms_db.aggregate([
            {
                $match: { auctions: { $ne: null } }
            },
            {
                $project: {
                    _id: "$_id",
                    connected_realm_id: "$connected_realm_id",
                    auctions: "$auctions",
                    name_locale: "$name_locale",
                }
            },
            {
                $group: {
                    _id: "$connected_realm_id",
                    auctions: {$max: "$auctions"},
                    realms: {$addToSet: "$name_locale"},
                }
            }
        ]);*/
        const t = await auctions_db.aggregate([
            {
                $match: { "item.id": item_id }
            },
            {
                $group: {
                    _id: "$connected_realm_id",
                    latest_timestamp: {$max:"$last_modified"}
                }
            }
        ])
        console.log(t);
        /*if (t) {
            let x = await auctions_db.aggregate([
                {
                    $match: {
                        last_modified: t.auctions,
                        "item.id": item_id,
                        connected_realm_id: connected_realm_id,
                    }
                },
                {
                    $project: {
                        _id: "$last_modified",
                        id: "$id",
                        quantity: "$quantity",
                        price: { $ifNull: [ "$buyout", { $ifNull: [ "$bid", "$unit_price" ] } ] },
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        quantity: {$sum: "$quantity"},
                        open_interest: {$sum: { $multiply: [ "$price", "$quantity" ] }},
                        min: {$min: "$price"},
                        min_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$price", {$min: "$price"}]}},
                        orders: {$addToSet: "$id"},
                    }
                }
            ]);
            console.log(x)
        }*/
        connection.close();
    } catch (error) {
        console.error(error)
    }
}

auctionsData();

module.exports = auctionsData;