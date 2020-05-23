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
 * TODO DayContractSchema
 * @type {Contract}
 */
const Contract = require('./classContracts_M.js');

/**
 * Moment monthsShort =>  Financial Format
 */
const moment = require('moment');
moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

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
                    { expansion:'BFA', asset_class: 'COMMDTY', is_commdty: true }
                ]
            }).lean()
        ]);
        for (let {_id, ticker, name} of items) {
            let code;
            if (ticker) {
                code = ticker;
            } else {
                code = name.en_GB;
            }
            for (let connected_realm_id of realms) {
                let contract_data = await contracts_db.find({
                    code: { $regex: new RegExp(`-(0[1-9]|[12]\\d|3[01]).${moment().subtract(1,'months').format('MMM')}$`), $options: 'i' },
                    type: 'D',
                    connected_realm_id: connected_realm_id,
                    item_id: _id
                }).lean();
                if (contract_data.length) {
                    await contracts_db.findOneAndUpdate(
                        {
                            _id: `${code}-${moment().format('MMM.YY')}@${connected_realm_id}`,
                        },
                        new Contract(
                            `${code}-${moment().format('MMM.YY')}@${connected_realm_id}`,
                            `${code}-${moment().format('MMM.YY')}`,
                            _id,
                            connected_realm_id,
                            'M',
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