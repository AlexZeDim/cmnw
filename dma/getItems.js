const keys_db = require("./../db/keys_db");
const items_db = require("./../db/items_db");
const battleNetWrapper = require('battlenet-api-wrapper');
const {connection} = require('mongoose');

async function getItems (queryKeys = { tags: `DMA` }) {
    try {
        console.time(`DMA-${getItems.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', '');
        for (let item_id = 18875; item_id < 250000; item_id++) {
            const [{id, name, quality, level, required_level, item_class, item_subclass, inventory_type, sell_price, max_count, is_equippable, is_stackable}, {assets}] = await Promise.all([
                bnw.WowGameData.getItem(item_id).catch(e => (e)),
                bnw.WowGameData.getItemMedia(item_id).catch(e => (e)),
            ]);
            if (id && assets) {
                await items_db.findByIdAndUpdate(
                    {
                        _id: id
                    }, {
                        _id: id,
                        name: name,
                        quality: quality.name.en_GB,
                        ilvl: level,
                        level: required_level,
                        item_class: item_class.name.en_GB,
                        item_subclass: item_subclass.name.en_GB,
                        inventory_type: inventory_type.name.en_GB,
                        sell_price: parseFloat((sell_price/10000).toFixed(2)),
                        max_count: max_count,
                        is_equippable: is_equippable,
                        is_stackable: is_stackable,
                        icon: assets[0].value
                    },
                    {
                        upsert: true,
                        new: true,
                        lean: true
                    }
                ).then(i => console.info(`C,${i._id}`))
            } else {
                console.info(`E,${item_id}`)
            }
        }
        connection.close();
        console.timeEnd(`DMA-${getItems.name}`);
    } catch (err) {
        console.error(`${getItems.name},${err}`);
    }
}

getItems();