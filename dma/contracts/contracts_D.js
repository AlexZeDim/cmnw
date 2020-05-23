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
 * TODO DayContractSchema
 * @type {Contract}
 */
const Contract = require('../contracts/classContracts_D.js');

/**
 * Moment monthsShort =>  Financial Format
 */
const moment = require('moment');
moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function contracts_D (arg_realm = 'ru_RU') {
    try {
        console.time(`DMA-${contracts_D.name}`);
        let query;
        let [realms, items] = await Promise.all([
            realms_db.distinct('connected_realm_id', {$or: [
                    { 'slug': arg_realm },
                    { 'locale': arg_realm },
                ]}).lean(),
            items_db.find({
                $or: [
                    { _id: 1 },
                    { expansion:'BFA', asset_class: 'COMMDTY', is_commdty: true }
                ]
            }).lean()
        ]);
        for (let {_id, ticker, name} of items) {
            let code;
            (ticker) ? (code = ticker) : (code = name.en_GB);
            for (let connected_realm_id of realms) {
                if (ticker === 'GOLD') {
                    query = golds_db.aggregate([
                        {
                            $match: {
                                createdAt: {$gt:moment.utc().subtract(1, 'day').toDate(), $lt:moment.utc().toDate()},
                                status: 'Online',
                                connected_realm_id: connected_realm_id
                            }
                        },
                        {
                            $group: {
                                _id: "$lastModified",
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
                                _id: "$lastModified",
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
                if (contract_data.length) {
                    await contracts_db.findOneAndUpdate(
                        {
                            _id: `${code}-${moment().format('DD.MMM')}@${connected_realm_id}`,
                        },
                        new Contract(
                            `${code}-${moment().format('DD.MMM')}@${connected_realm_id}`,
                            `${code}-${moment().format('DD.MMM')}`,
                            _id,
                            connected_realm_id,
                            'D',
                            contract_data
                        ),
                        {
                            upsert : true,
                            new: true,
                            setDefaultsOnInsert: true,
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