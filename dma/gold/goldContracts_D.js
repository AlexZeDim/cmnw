const Contract = require('../classContracts_D.js');
const realms_db = require("../../db/realms_db");
const golds_db = require("../../db/golds_db");
const contracts_db = require("../../db/contracts_db");
const moment = require('moment');
const {connection} = require('mongoose');

moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function goldContracts_D (arg_realm) {
    try {
        let realms = await realms_db.find({$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean().cursor({batchSize: 1});
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            const contract_data = await golds_db.aggregate([
                {
                    $match: {
                        createdAt: {$gt:moment.utc().subtract(1, 'day').toDate(), $lt:moment.utc().toDate()},
                        status: 'Online',
                        connected_realm_id: realm.connected_realm_id
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
            ]);
            if (contract_data) {
                await contracts_db.findOneAndUpdate(
                    {
                        _id: `GOLD-${moment().format('DD.MMM')}@${realm.slug.toUpperCase()}`,
                    },
                    new Contract (
                        `GOLD-${moment().format('DD.MMM')}@${realm.slug.toUpperCase()}`,
                        `GOLD-${moment().format('DD.MMM')}`,
                        1,
                        realm.connected_realm_id,
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
                console.info(`E,GOLD-${moment().format('DD.MMM')}@${realm.name.toUpperCase()}`);
            }
        }
        connection.close();
    } catch (err) {
        console.error(`${goldContracts_D.name}${err}`);
    }
}

goldContracts_D('ru_RU');