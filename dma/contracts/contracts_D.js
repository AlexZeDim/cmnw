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
 * Moment monthsShort =>  Financial Format
 */
const moment = require('moment');
moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

const {Round2} = require("../../db/setters");

const standardDeviation = (arr, usePopulation = true) => {
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    return Math.sqrt(
        arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
        (arr.length - (usePopulation ? 0 : 1))
    ) || 0;
};

/**
 * Create Day contracts for items
 * @param arg_realm
 * @returns {Promise<void>}
 */

async function contracts_D (arg_realm = 'ru_RU') {
    try {
        console.time(`DMA-${contracts_D.name}`);
        let [realms, items] = await Promise.all([
            realms_db.distinct('connected_realm_id', {$or: [
                    { 'slug': arg_realm },
                    { 'locale': arg_realm },
                ]}).lean(),
            items_db.find({
                $or: [
                    { _id: 1 },
                    { expansion: 'BFA', asset_class: { $all: [ "MARKET" , "COMMDTY" ] } }
                ]
            }).lean()
        ]);
        for (let {_id, ticker, name} of items) {
            let code = name.en_GB;
            if (ticker) {
                code = ticker
            }
            for (let connected_realm_id of realms) {
                let query;
                if (ticker === 'GOLD') {
                    query = golds_db.aggregate([
                        {
                            $match: {
                                createdAt: {$gt: moment.utc().subtract(1, 'day').toDate(), $lt: moment.utc().toDate()},
                                status: 'Online',
                                connected_realm_id: connected_realm_id
                            }
                        },
                        {
                            $group: {
                                _id: "$last_modified",
                                open_interest: {$sum: { $multiply: [ "$price", {$divide: ["$quantity", 1000]} ] }},
                                quantity: {$sum: "$quantity"},
                                price: {$min: "$price"},
                                price_size: {$min: {$cond: [{$gte: ["$quantity", 1000000]}, "$price", "$min:$price"]}},
                                sellers: {$addToSet: "$owner"},
                            }
                        },
                        {
                            $sort: { _id: 1 }
                        },
                    ]).catch(e=>(e));
                } else {
                    query = auctions_db.aggregate([
                        {
                            $match: {
                                "item.id": _id,
                                connected_realm_id: connected_realm_id,
                            }
                        },
                        {
                            $group: {
                                _id: "$last_modified",
                                open_interest: {$sum: { $multiply: [ "$unit_price", "$quantity" ] }},
                                quantity: {$sum: "$quantity" },
                                price: {$min: "$unit_price"},
                                price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$unit_price", null]}},
                                orders: { $push:  { id: "$id", time_left: "$time_left" } }
                            }
                        },
                        {
                            $sort: { _id: 1 }
                        },
                    ]).catch(e=>(e))
                }
                const contract_data = await query;
                if (contract_data && contract_data.length) {

                    /**
                     * Create new Day contract
                     */
                    let contract = new contracts_db({
                        _id: `${code}-${moment().format('DD.MMM')}@${connected_realm_id}`,
                        code: `${code}-${moment().format('DD.MMM')}`,
                        item_id: _id,
                        connected_realm_id: connected_realm_id,
                        date: {
                            day: moment().get('date'),
                            week: moment().get('week'),
                            month: moment().get('month')+1,
                            year: moment().get('year'),
                        },
                        type: `D`,
                    });

                    /**
                     * Declare new arrays
                     * @type {*[]}
                     */
                    let expired_Array = [];
                    let orders_Array = [];
                    let price_Array = [];
                    let price_size_Array = [];
                    let quantity_Array = [];
                    let open_interest_Array = [];
                    let orders_count_Array = [];

                    /**
                     * Unique orders stored in Set
                     * @type {Set<any>}
                     */
                    const added_orders = new Set();
                    const cancelled_orders = new Set();
                    const expired_orders = new Set();
                    const total_orders = new Set();
                    const sellersArray = new Set();

                    /**
                     * Data from timestamp
                     */
                    contract_data.map(({_id, price, price_size, quantity, open_interest, orders, sellers}, i) => {
                        /**
                         * Form [] of price, quantity, oi
                         */
                        price_Array.push(Round2(price));
                        quantity_Array.push(Round2(quantity));
                        open_interest_Array.push(Round2(open_interest));
                        /** Price_size [] if exists  */
                        if (price_size) {
                            price_size_Array.push(Round2(price_size));
                        }
                        /** Orders [] if exists */
                        if (orders) {
                            orders_count_Array.push(orders.length);
                            /**
                             * form EXPIRED (status:SHORT) orders on timestamp
                             * Add all orders to [] on timestamp
                             */
                            orders.map(({id, time_left}) => {
                                if (time_left === 'SHORT') {
                                    expired_Array.push(id);
                                    expired_orders.add(id);
                                }
                                total_orders.add(id);
                                orders_Array.push(id)
                            });
                            /** Orders on timestamp that wouldn't expire */
                            let orders_T0 = orders_Array.filter(val => !expired_Array.includes(val));
                            /** All Orders from next timestamp */
                            let orders_T1;
                            /** Cancelled orders */
                            let orders_C;
                            /** Added orders */
                            let orders_A;
                            /** If new timestamp exists.. */
                            if (contract_data[i+1]) {
                                /** Add to orders_T1 every order */
                                orders_T1 = contract_data[i+1].orders.map(({id}) => id);
                                /**
                                 *  Order on current timestamp (that wouldn't expire)
                                 *  doesn't exist on next timestamp =>
                                 *  it's CANCELLED
                                 */
                                orders_C = orders_T0.filter(order => {
                                    if (!orders_T1.includes(order)) {
                                        cancelled_orders.add(order);
                                        return order
                                    }
                                });
                                /**
                                 *  Order on next timestamp that not exist on
                                 *  current (that doesn't expire) timestamp is
                                 *  ADDED order
                                 */
                                orders_A = orders_T1.filter(order => {
                                    if (!orders_T0.includes(order)) {
                                        added_orders.add(order);
                                        return order
                                    }
                                });
                                contract_data[i].added = orders_A.length;
                                contract_data[i].canceled = orders_C.length;
                            }
                            contract_data[i].expired = expired_Array.length;
                            orders_Array.length = 0;
                            expired_Array.length = 0;
                        }
                        if (sellers) {
                            sellers.map(seller => sellersArray.add(seller));
                        }
                    });
                    /** Pricing for single item */
                    contract.price = {
                        open: price_Array[0],
                        low: Math.min(...price_Array),
                        change: Round2(price_Array[price_Array.length-1] - price_Array[0]),
                        avg: Round2(price_Array.reduce((total, next) => total + next, 0) / price_Array.length),
                        high: Math.max(...price_Array),
                        close: price_Array[price_Array.length-1],
                    }
                    /** Standard deviation for single item price */
                    contract.risk = {
                        stdDev: Round2(standardDeviation(price_Array.map(price => price*100))/100),
                    }
                    /** Pricing for stack_size item with standard deviation */
                    if (price_size_Array && price_size_Array.length) {
                        contract.risk.stdDev_size = Round2(standardDeviation(price_size_Array.map(price_size => price_size*100))/100);
                        contract.price_size = {
                            open: price_size_Array[0],
                            low: Math.min(...price_size_Array),
                            change: Round2(price_size_Array[price_size_Array.length - 1] - price_size_Array[0]),
                            avg: Round2(price_size_Array.reduce((total, next) => total + next, 0) / price_size_Array.length),
                            high: Math.max(...price_size_Array),
                            close: price_size_Array[price_size_Array.length - 1],
                        };
                    }
                    /** Orders for item (WOW Auction House) */
                    if (orders_count_Array && orders_count_Array.length) {
                        contract.orders = {
                            open: orders_count_Array[0],
                            low: Math.min(...orders_count_Array),
                            change: (orders_count_Array[orders_count_Array.length-1] - orders_count_Array[0]),
                            high: Math.max(...orders_count_Array),
                            close: orders_count_Array[orders_count_Array.length-1],
                            orders_total: total_orders.size,
                            orders_added: added_orders.size,
                            orders_cancelled: cancelled_orders.size,
                            orders_expired: expired_orders.size,
                            ratio_added: Round2(added_orders.size/total_orders.size),
                            ratio_cancelled: Round2(cancelled_orders.size/total_orders.size),
                            ratio_expired: Round2(expired_orders.size/total_orders.size),
                        };
                    }
                    /** Quantity for item */
                    contract.quantity = {
                        open: quantity_Array[0],
                        low: Math.min(...quantity_Array),
                        change: (quantity_Array[quantity_Array.length-1] - quantity_Array[0]),
                        high: Math.max(...quantity_Array),
                        close: quantity_Array[quantity_Array.length-1],
                    };
                    /** Open Interest (price x quantity) */
                    contract.open_interest = {
                        open: open_interest_Array[0],
                        low: Math.min(...open_interest_Array),
                        change: parseFloat((open_interest_Array[open_interest_Array.length-1] - open_interest_Array[0]).toFixed(2)),
                        high: Math.max(...open_interest_Array),
                        close: open_interest_Array[open_interest_Array.length-1],
                    };
                    /** Sellers for GOLD (FUNPAY) */
                    if (sellersArray.size !== 0) {
                        contract.sellers = {
                            sellers: [...sellersArray],
                            open: contract_data[0].sellers.length,
                            change: contract_data[contract_data.length-1].sellers.length - contract_data[0].sellers.length,
                            close: contract_data[contract_data.length-1].sellers.length,
                            total: sellersArray.size,
                        };
                    }
                    /** Store original data */
                    contract.data = contract_data

                    await contracts_db.findOneAndUpdate(
                        {
                            _id: `${code}-${moment().format('DD.MMM')}@${connected_realm_id}`,
                        },
                        contract.toObject(),
                        {
                            upsert : true,
                            new: true,
                            runValidators: true,
                            lean: true
                        }
                    ).then(i => console.info(`C,${i._id}`))
                } else {
                    console.error(`E,${code}-${moment().format('DD.MMM')}@${connected_realm_id}`);
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${contracts_D.name}`);
    } catch (error) {
        console.error(`${contracts_D.name},${error}`)
    }
}

contracts_D();