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

const auctions_db = require("../../db/auctions_db");

/**
 * Modules
 */


/**
 * This function parse items across B.net API with wrapper
 * @returns {Promise<void>}
 */

async function _itemBonusList (item_id = 175010) {
    try {
        console.time(`DMA-${_itemBonusList.name}`);

        const item = await auctions_db.aggregate([
            {
                $match: {
                    'item.id': item_id
                }
            },
            {
                $limit: 1,
            },
            {
                $lookup: {
                    from: "bonus_lists",
                    localField: "item.bonus_lists",
                    foreignField: "_id",
                    as: "item.bonus_lists"
                }
            },
            {
                $lookup: {
                    from: "items",
                    localField: "item.id",
                    foreignField: "_id",
                    as: "fromItems"
                }
            },
            {
                $addFields: {
                    fromItems: { $arrayElemAt: [ "$fromItems", 0 ] },
                }
            },
            {
                $addFields: {
                     item: { $mergeObjects: [ "$fromItems" , "$item"] },
                }
            },
            {
                $project: {
                    fromItems: 0
                }
            }
        ])
        console.log(item[0].item.bonus_lists);
        connection.close();
        console.timeEnd(`DMA-${_itemBonusList.name}`);
    } catch (err) {
        console.error(`${_itemBonusList.name},${err}`);
    }
}

_itemBonusList();