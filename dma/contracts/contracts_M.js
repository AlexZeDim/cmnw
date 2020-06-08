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
const contracts_db = require("../../db/contracts_db");
const realms_db = require("../../db/realms_db");
const items_db = require("../../db/items_db");

/**
 * Moment monthsShort =>  Financial Format
 */
const moment = require('moment');
moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

const {Round2} = require("../../db/setters");

/**
 *
 * @param arr[]
 * @param usePopulation
 * @returns {number}
 */

const standardDeviation = (arr, usePopulation = true) => {
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    return Math.sqrt(
        arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
        (arr.length - (usePopulation ? 0 : 1))
    ) || 0;
};

/**
 * @param portfolioEquityCurve
 * @returns {number[]}
 */

const arithmeticReturns = portfolioEquityCurve => {
    let returns = new Array(portfolioEquityCurve.length);
    returns[0] = 0;
    for (let i = 1; i < portfolioEquityCurve.length; ++i) {
        returns[i] = ((portfolioEquityCurve[i] - portfolioEquityCurve[i-1])/portfolioEquityCurve[i-1]);
    }
    return returns;
};

/**
 *
 * @param portfolioEquityCurve
 * @param alpha
 * @returns {number}
 * @constructor
 */

const VaR = (portfolioEquityCurve, alpha) => {
    let returns = arithmeticReturns(portfolioEquityCurve).slice(1);
    returns.sort((a, b) => { return a - b;});
    let c_alpha = 1 - alpha;
    let w = c_alpha * returns.length;
    if (w === 0) {
        return 0;
    }
    return Round2(-returns[Math.round(w)-1]) || 0;
};

/**
 *
 * @param arg_realm
 * @returns {Promise<void>}
 */

async function contracts_M (arg_realm = 'ru_RU') {
    try {
        console.time(`DMA-${contracts_M.name}`);
        let [realms, items] = await Promise.all([
            realms_db.distinct('connected_realm_id', {$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean(),
            items_db.find({
                $or: [
                    { _id: 1 },
                    { expansion: 'BFA', is_commdty: true }
                ]
            }).lean()
        ]);
        for (let {_id, ticker, name} of items) {
            let code = name.en_GB;
            (ticker) ? (code = ticker) : ('');
            for (let connected_realm_id of realms) {
                let contract_data = await contracts_db.find({
                    "date.month": moment().get('month')+1,
                    type: 'D',
                    connected_realm_id: connected_realm_id,
                    item_id: _id
                }).sort("updatedAt").lean();
                if (contract_data && contract_data.length) {

                    /**
                     * Create new Month contract
                     */
                    let contract = new contracts_db({
                        _id: `${code}-${moment().format('MMM.YY')}@${connected_realm_id}`,
                        code: `${code}-${moment().format('MMM.YY')}`,
                        item_id: _id,
                        connected_realm_id: connected_realm_id,
                        date: {
                            day: moment().get('date'),
                            week: moment().get('week'),
                            month: moment().get('month')+1,
                            year: moment().get('year'),
                        },
                        type: `M`,
                    });

                    /**
                     * Declare new arrays
                     * @type {*[]}
                     */
                    let price_low_Array = [];
                    let price_high_Array = [];
                    let quantity_low_Array = [];
                    let quantity_high_Array = [];
                    let oi_low_Array = [];
                    let oi_high_Array = [];
                    let price_Array = [];
                    let price_size_Array = [];
                    let orders_a = 0;
                    let orders_c = 0;
                    let orders_e = 0;
                    let o_low_Array = [];
                    let o_high_Array = [];
                    let dataArray = [];
                    /**
                     * Unique orders and sellers are stored in Set
                     * @type {Set<any>}
                     */
                    const sellersArray = new Set();
                    const ordersArray = new Set();

                    /**
                     * Data from every Day contract
                     */
                    contract_data.map(({price, quantity, open_interest, orders, sellers, data}) => {
                        let contract_day = {};
                        /** Price for x1 item */
                        if (price) {
                            Object.assign(contract_day, {price: price});
                            let {low, high} = price;
                            price_low_Array.push(low);
                            price_high_Array.push(high);
                        }
                        /** Quantity for item */
                        if (quantity) {
                            Object.assign(contract_day, {quantity: quantity});
                            let {low, high} = quantity;
                            quantity_low_Array.push(low);
                            quantity_high_Array.push(high);
                        }
                        /** Open Interest (price x quantity) */
                        if (open_interest) {
                            Object.assign(contract_day, {open_interest: open_interest});
                            let {low, high} = open_interest;
                            oi_low_Array.push(low);
                            oi_high_Array.push(high);
                        }
                        /** Orders for item (WOW Auction House) */
                        if (orders) {
                            Object.assign(contract_day, {orders: orders});
                            let {orders_added, orders_cancelled, orders_expired, low, high} = orders;
                            orders_a += orders_added;
                            orders_c += orders_cancelled;
                            orders_e += orders_expired;
                            o_low_Array.push(low);
                            o_high_Array.push(high);
                        }
                        /** Sellers for GOLD (FUNPAY) */
                        if (sellers) {
                            Object.assign(contract_day, {sellers: {
                                open: sellers.open,
                                change: sellers.change,
                                close: sellers.close,
                                total: sellers.total
                            }});
                        }
                        /** Data from every Day contract to M Data */
                        data.map(({price, price_size, sellers, orders}) => {
                            if (orders) {
                                orders.map(({id}) => {
                                    ordersArray.add(id);
                                })
                            }
                            price_Array.push(price);
                            if (price_size) price_size_Array.push(price_size);
                            if (sellers) sellers.map(x => sellersArray.add(x))
                        });
                        dataArray.push(contract_day);
                    });

                    contract.price = {
                        open: contract_data[0].price.open,
                        low: Math.min(...price_low_Array),
                        avg: Round2((price_Array.reduce((total, next) => total + next, 0) / price_Array.length)),
                        change: Round2(contract_data[contract_data.length-1].price.close - contract_data[0].price.open),
                        high: Math.max(...price_high_Array),
                        close: contract_data[contract_data.length-1].price.close
                    };

                    contract.risk = {
                        stdDev: Round2(standardDeviation(price_Array)),
                        VaR: VaR(price_Array, 0.8) || 0
                    };

                    if (price_size_Array && price_size_Array.length) {
                        contract.risk.stdDev_size = Round2(standardDeviation(price_size_Array));
                        contract.risk.VaR_size = VaR(price_size_Array, 0.80) || 0;
                        contract.price_size = {
                            open: price_size_Array[0],
                            low: Math.min(...price_size_Array),
                            change: Round2((price_size_Array[price_size_Array.length - 1] - price_size_Array[0])),
                            avg: Round2(price_size_Array.reduce((total, next) => total + next, 0) / price_size_Array.length),
                            high: Math.max(...price_size_Array),
                            close: price_size_Array[price_size_Array.length - 1],
                        };
                    }

                    contract.quantity = {
                        open: contract_data[0].quantity.open,
                        low: Math.min(...quantity_low_Array),
                        change: Round2(contract_data[contract_data.length-1].quantity.close - contract_data[0].quantity.open),
                        high: Math.max(...quantity_high_Array),
                        close: contract_data[contract_data.length-1].quantity.close,
                    };

                    contract.open_interest = {
                        open: contract_data[0].open_interest.open,
                        low: Math.min(...oi_low_Array),
                        change: Round2(contract_data[contract_data.length-1].open_interest.close - contract_data[0].open_interest.open),
                        high: Math.max(...oi_high_Array),
                        close: contract_data[contract_data.length-1].open_interest.close,
                    };

                    if (ordersArray.size !== 0) {
                        contract.orders = {
                            open: contract_data[0].orders.open,
                            low: Math.min(...o_low_Array),
                            change: Round2(contract_data[contract_data.length-1].orders.close - contract_data[0].orders.open),
                            high: Math.max(...o_high_Array),
                            close: contract_data[contract_data.length-1].orders.close,
                            orders_total: ordersArray.size,
                            orders_added: orders_a,
                            orders_cancelled: orders_c,
                            orders_expired: orders_e,
                            ratio_added: Round2(orders_a/ordersArray.size),
                            ratio_cancelled: Round2(orders_c/ordersArray.size),
                            ratio_expired: Round2(orders_c/ordersArray.size),
                        };
                    }

                    if (sellersArray.size !== 0) {
                        contract.sellers = {
                            sellers: [...sellersArray],
                            open: contract_data[0].sellers.open,
                            change: Round2(contract_data[contract_data.length-1].sellers.close - contract_data[0].sellers.open),
                            close: contract_data[contract_data.length-1].sellers.close,
                            total: sellersArray.size,
                        };
                    }

                    contract.data = dataArray;

                    await contracts_db.findOneAndUpdate(
                        {
                            _id: `${code}-${moment().format('MMM.YY')}@${connected_realm_id}`,
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
                    console.error(`E,${code}-${moment().format('MMM.YY')}@${connected_realm_id}`);
                }
            }
        }
        connection.close();
        console.timeEnd(`DMA-${contracts_M.name}`);
    } catch (err) {
        console.error(`${contracts_M.name}${err}`);
    }
}

contracts_M();