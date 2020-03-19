const realms_db = require("../../db/realms_db");
const auctions_db = require("../../db/auctions_db");
const Contract = require('../classContracts_D.js');
const moment = require('moment');

moment.updateLocale('en', {
    monthsShort : ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"]
});

async function createAssetContract (arg_realm = 'gordunni', arg_asset, period) {
    try {
        let realms = await realms_db.find({$or: [
                { 'slug': arg_realm },
                { 'locale': arg_realm },
            ]}).lean().cursor({batchSize: 1});
        let items = [168487, 152510];
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            for (let i = 0; i < items.length; i++) {
                const contract_data = await auctions_db.aggregate([
                    {
                        $match: {
                            "item.id": items[i],
                            connected_realm_id: realm.connected_realm_id,
                        }
                    },
                    {
                        $group: {
                            _id: "$lastModified",
                            open_interest: {$sum: { $multiply: [ "$unit_price", "$quantity" ] }},
                            quantity: {$sum: "$quantity" },
                            price: {$min: "$unit_price"},
                            price_size: {$min: {$cond: [{$gte: ["$quantity", 200]}, "$unit_price", "$min:$unit_price"]}},
                        }
                    }
                ]);
                if (contract_data) {
                    console.log(
                        new Contract(
                            `TICKER-${moment().format('DD.MMM')}@${realm.slug.toUpperCase()}`,
                            `TICKER-${moment().format('DD.MMM')}`,
                            realm.connected_realm_id,
                            'D',
                            contract_data)
                    )
                }
            }
        }
    } catch (err) {
        console.error(`${createAssetContract.name},${err}`)
    }
}

createAssetContract();

module.exports = createAssetContract;