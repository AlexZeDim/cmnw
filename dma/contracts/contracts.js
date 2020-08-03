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
const realms_db = require("../../db/realms_db");
const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const golds_db = require("../../db/golds_db");
const contracts_db = require("../../db/contracts_db");

/**
 * Modules
 */
const moment = require('moment');
const {Round2} = require("../../db/setters");



async function contracts (arg_realm = 'ru_RU') {
    try {
        console.time(`DMA-${contracts.name}`);
        let [realms, items] = await Promise.all([
            realms_db.distinct('connected_realm_id', {$or: [
                    { 'slug': arg_realm },
                    { 'locale': arg_realm },
                ]}).lean(),
            items_db.find({ contracts: true }).lean()
        ]);
        for (let item of items) {
            let item_name = item.name.en_GB;
            if (item.ticker) {
                item_name = item.ticker
            }
            let stack_size = 200;
            if (item.stackable) {
                stack_size = item.stackable;
            }
            for (let connected_realm_id of realms) {
                let contract_query;
                if (item.ticker === 'GOLD') {
                    contract_query = golds_db.aggregate([
                        {
                            $match: {
                                createdAt: { $gt: moment.utc().subtract(1, 'day').toDate(), $lt: moment.utc().toDate() },
                                status: 'Online',
                                connected_realm_id: connected_realm_id
                            }
                        },
                        {
                            $group: {
                                _id: "$last_modified",
                                open_interest: { $sum: { $multiply: [ "$price", { $divide: ["$quantity", 1000] } ] } },
                                quantity: { $sum: "$quantity" },
                                price: { $min: "$price" },
                                price_size: { $min: { $cond: [ { $gte: [ "$quantity", 1000000 ] }, "$price", "$min:$price"] } },
                                sellers: { $addToSet: "$owner" },
                            }
                        },
                        {
                            $sort: { _id: 1 }
                        },
                    ]).catch(e=>(e));
                } else {
                    contract_query = auctions_db.aggregate([
                        {
                            $match: {
                                "item.id": item._id,
                                connected_realm_id: connected_realm_id,
                            }
                        },
                        {
                            $group: {
                                _id: "$last_modified",
                                open_interest: { $sum: { $multiply: [ "$unit_price", "$quantity" ] } },
                                quantity: { $sum: "$quantity" },
                                price: { $min: "$unit_price" },
                                price_size: { $min: { $cond: [ { $gte: [ "$quantity", stack_size ] }, "$unit_price", null] } },
                                orders: { $push:  { id: "$id", time_left: "$time_left" } }
                            }
                        },
                        {
                            $sort: { _id: 1 }
                        },
                    ]).catch(e=>(e))
                }
                const timestamp_data = await contract_query;
                if (timestamp_data && timestamp_data.length) {
                    for (let timestamp of timestamp_data) {
                        /** Create new Contract */
                        let contract = await contracts_db.findById(`${item_name}-${timestamp._id}@${connected_realm_id}`);

                        if (!contract) {
                            contract = new contracts_db({
                                _id: `${item_name}-${timestamp._id}@${connected_realm_id}`,
                                item_id: item._id,
                                connected_realm_id: connected_realm_id,
                                last_modified: timestamp._id,
                                date: {
                                    day: moment().get('date'),
                                    week: moment().get('week'),
                                    month: moment().get('month')+1,
                                    year: moment().get('year'),
                                },
                            });
                        }

                        contract.price = Round2(timestamp.price);
                        contract.quantity = timestamp.quantity;
                        contract.open_interest = Round2(timestamp.open_interest);

                        if (timestamp.price_size) {
                            contract.price_size = Round2(timestamp.price_size);
                        }

                        if (timestamp.orders) {
                            contract.orders = timestamp.orders;
                        }

                        if (timestamp.sellers) {
                            contract.sellers = timestamp.sellers;
                        }

                        await contract.save()
                        console.info(`C,${contract._id}`)
                    }
                } else {
                    console.error(`E,${item_name}-${moment().format('DD.MMM.WW.YY')}@${connected_realm_id}`);
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${contracts.name}`);
    } catch (error) {
        console.error(`${contracts.name},${error}`)
    }
}

contracts();