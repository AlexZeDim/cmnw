const Contract = require('./classContracts_M.js');
const contracts_db = require("../../db/contracts_db");
const realms_db = require("../../db/realms_db");
const items_db = require("../../db/items_db");
const moment = require('moment');
const {connection} = require('mongoose');

moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function contracts_M (arg_realm = 'ru_RU') {
    try {
        let [realms, items] = await Promise.all([
            realms_db.distinct('connected_realm_id', {$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean(),
            items_db.find({
                $or: [
                    { _id: 1 },
                    { expansion:'BFA', derivative: 'COMMDTY', is_commdty: true }
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
    } catch (err) {
        console.error(`${contracts_M.name}${err}`);
    }
}

contracts_M();