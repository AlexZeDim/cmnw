const keys_db = require("./../db/keys_db");
const items_db = require("./../db/items_db");
const battleNetWrapper = require('battlenet-api-wrapper');
const {connection} = require('mongoose');

async function test (queryKeys = { tags: `Depo` }) {
    try {
        console.time(`DMA-${test.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        //TODO locale list? index with bnw?
        //TODO sell price for gold

        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        let item = await bnw.WowGameData.getItem(174141);
        if (item) {
            console.log(item);
            /*await items_db.findByIdAndUpdate(
                {
                    _id: item.id
                }, {
                    _id: item.id,
                    "name.en_GB": item.name,
                    quality: item.quality.name,
                    level: item.level,
                    //TODO icon: item,
                    item_class: item.item_class.name,
                    item_subclass: item.item_subclass.name,
                    sell_price: item.sell_price,
                    is_equippable: item.is_equippable,
                    is_stackable: item.is_stackable,
                    inventory_type: item.inventory_type.name
                },
                {
                    upsert: true,
                    new: true,
                    lean: true
                }
            )*/
        }
        connection.close();
        console.timeEnd(`DMA-${test.name}`);
    } catch (err) {
        console.error(`${test.name},${err}`);
    }
}

test();