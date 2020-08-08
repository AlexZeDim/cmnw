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
const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const golds_db = require("../../db/golds_db");
const contracts_db = require("../../db/contracts_db");

/**
 * Modules
 */
const moment = require('moment');

async function contracts () {
    try {
        console.time(`DMA-${contracts.name}`);
        let d = moment().get('date');
        let w = moment().get('week')
        let m = moment().get('month')+1
        let y = moment().get('year')
        let items = await items_db.find({ contracts: true }).lean()
        for (let item of items) {
            let item_name = item.name.en_GB;
            if (item.ticker) {
                item_name = item.ticker
            }
            let stack_size = 1;
            if (item.stackable) {
                stack_size = item.stackable;
            }
            let contract_query;
            if (item.ticker === 'GOLD') {
                contract_query = golds_db.aggregate([
                    {
                        $match: {
                            createdAt: { $gt: moment.utc().subtract(1, 'day').toDate() },
                            status: 'Online',
                        }
                    },
                    {
                        $sort: { last_modified: 1 }
                    },
                    {
                        $group: {
                            _id: {
                                connected_realm_id: "$connected_realm_id",
                                last_modified: "$last_modified"
                            },
                            open_interest: { $sum: { $multiply: [ "$price", { $divide: ["$quantity", 1000] } ] } },
                            quantity: { $sum: "$quantity" },
                            price: { $min: "$price" },
                            price_size: { $min: { $cond: [ { $gte: [ "$quantity", 1000000 ] }, "$price", "$min:$price"] } },
                            sellers: { $addToSet: "$owner" },
                        }
                    },
                    {
                        $project: {
                            item_id: 1,
                            connected_realm_id: "$_id.connected_realm_id",
                            last_modified: "$_id.last_modified",
                            price: "$price",
                            price_size: "$price_size",
                            quantity: "$quantity",
                            open_interest: "$open_interest",
                            sellers: "$sellers",
                        }
                    },
                    {
                        $addFields: {
                            _id: { $concat: [ "1-", { $convert: { input: "$_id.last_modified", to: "string" } }, "@", { $convert: { input: "$_id.connected_realm_id", to: "string" } } ] },
                            date: {
                                day: d,
                                week: w,
                                month: m,
                                year: y,
                            }
                        }
                    }
                ]).catch(e=>(e));
            } else {
                contract_query = auctions_db.aggregate([
                    {
                        $match: {
                            "item.id": item._id,
                        }
                    },
                    {
                        $sort: { last_modified: 1 }
                    },
                    {
                        $group: {
                            _id: {
                                item_id: "$item.id",
                                connected_realm_id: "$connected_realm_id",
                                last_modified: "$last_modified"
                            },
                            open_interest: { $sum: { $multiply: [ "$unit_price", "$quantity" ] } },
                            quantity: { $sum: "$quantity" },
                            price: { $min: "$unit_price" },
                            price_size: { $min: { $cond: [ { $gte: [ "$quantity", stack_size ] }, "$unit_price", null] } },
                            orders: { $push:  { id: "$id", time_left: "$time_left" } }
                        }
                    },
                    {
                        $project: {
                            item_id: "$_id.item_id",
                            connected_realm_id: "$_id.connected_realm_id",
                            last_modified: "$_id.last_modified",
                            price: "$price",
                            price_size: "$price_size",
                            quantity: "$quantity",
                            open_interest: "$open_interest",
                            orders: "$orders",
                        }
                    },
                    {
                        $addFields: {
                            _id: { $concat: [ { $convert: { input: "$_id.item_id", to: "string" } }, "-", { $convert: { input: "$_id.last_modified", to: "string" } }, "@", { $convert: { input: "$_id.connected_realm_id", to: "string" } }] },
                            item_id: 1,
                            date: {
                                day: d,
                                week: w,
                                month: m,
                                year: y,
                            }
                        }
                    }

                ]).catch(e=>(e))
            }
            const timestamp_data = await contract_query;
            if (timestamp_data && timestamp_data.length) {
                console.log(timestamp_data)
                await contracts_db.insertMany(timestamp_data, {ordered: false}).catch(error => error)
                console.info(`C,${item_name}-${moment().format('DD.MMM.WW.YY')}`);
            } else {
                console.error(`E,${item_name}-${moment().format('DD.MMM.WW.YY')}`);
            }
        }
        connection.close();
        console.timeEnd(`DMA-${contracts.name}`);
    } catch (error) {
        console.error(`${contracts.name},${error}`)
    }
}

contracts();