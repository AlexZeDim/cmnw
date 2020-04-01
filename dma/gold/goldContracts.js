const Contract = require('../contracts/classContracts_M.js');
const contracts_db = require("../../db/contracts_db");
const realms_db = require("../../db/realms_db");
const moment = require('moment');
const {connection} = require('mongoose');

moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function goldContracts_M (arg_realm = 'gordunni') {
    try {
        let realms = await realms_db.find({$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean().cursor({batchSize: 1});
        for await (let {connected_realm_id, slug} of realms) {
            //TODO sort it
            let contract_data = await contracts_db.find({
                code: { $regex: new RegExp(`^ZNTD-(0[1-9]|[12]\\d|3[01]).${moment().subtract(0,'months').format('MMM')}`), $options: 'i' },
                type: 'D',
                connected_realm_id: connected_realm_id,
            }).lean();
            console.log(new Contract(
                `ZNTD-${moment().format('MMM.YY')}@${slug.toUpperCase()}`,
                `ZNTD-${moment().format('MMM.YY')}`,
                1,
                connected_realm_id,
                'M',
                contract_data
            ));
        }
        connection.close();
    } catch (err) {
        console.error(`${goldContracts_M.name}${err}`);
    }
}

goldContracts_M();