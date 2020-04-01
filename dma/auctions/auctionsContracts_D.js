const realms_db = require("../../db/realms_db");
const items_db = require("../../db/items_db");
const auctions_db = require("../../db/auctions_db");
const contracts_db = require("../../db/contracts_db");
const Contract = require('../contracts/classContracts_D.js');
const moment = require('moment');
const {connection} = require('mongoose');

moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function createAssetContract (arg_realm = 'ashenvale', arg_asset, period = 'D') {
    try {
        let items = await items_db.find({"name.en_GB": "Zin'anthid", expansion:'BFA', derivative: 'COMMDTY', is_commdty: true}).lean();
        let realms = await realms_db.find({$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean().cursor({batchSize: 1});
        for await (let {connected_realm_id, slug} of realms) {
            for (let {_id, ticker, name} of items) {
                const contract_data = await auctions_db.aggregate([
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
                ]);
                let code;
                if (ticker) {
                    code = ticker;
                } else {
                    code = name.en_GB;
                }
                if (contract_data) {
                    console.log(
                        new Contract(
                        `${code}-${moment().format('DD.MMM')}@${slug.toUpperCase()}`,
                        `${code}-${moment().format('DD.MMM')}`,
                        _id,
                        connected_realm_id,
                        period,
                        contract_data
                    ));
/*                    await contracts_db.findOneAndUpdate(
                        {
                            _id: `${code}-${moment().format('DD.MMM')}@${slug.toUpperCase()}`,
                        },
                        new Contract(
                            `${code}-${moment().format('DD.MMM')}@${slug.toUpperCase()}`,
                            `${code}-${moment().format('DD.MMM')}`,
                            _id,
                            connected_realm_id,
                            period,
                            contract_data
                        ),
                        {
                            upsert : true,
                            new: true,
                            setDefaultsOnInsert: true,
                            runValidators: true,
                            lean: true
                        }
                    ).then(i => console.info(`C,${i._id}`))*/
                } else {
                    console.info(`E,GOLD-${moment().format('DD.MMM')}@${slug.toUpperCase()}`);
                }
            }
        }
        connection.close();
    } catch (error) {
        console.error(`${createAssetContract.name},${error}`)
    }
}

createAssetContract();