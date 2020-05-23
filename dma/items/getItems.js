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

const keys_db = require("../../db/keys_db");
const items_db = require("../../db/items_db");

/**
 * B.net API wrapper
 */
const battleNetWrapper = require('battlenet-api-wrapper');

/***
 * TODO with new Model
 * @param queryKeys {object}
 * @param isNew {boolean}
 * @returns {Promise<void>}
 */

async function getItems (queryKeys = { tags: `DMA` }, isNew = true) {
    try {
        console.time(`DMA-${getItems.name}`);
        const { _id, secret, token } = await keys_db.findOne(queryKeys);
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', '');

        const getItemById = async (item_id = 25) => {
            const [{id, name, quality, level, required_level, item_class, item_subclass, inventory_type, purchase_price, sell_price, max_count, is_equippable, is_stackable}, {assets}] = await Promise.all([
                bnw.WowGameData.getItem(item_id).catch(e => (e)),
                bnw.WowGameData.getItemMedia(item_id).catch(e => (e)),
            ]);
            if (id && assets && quality.name && item_class.name && item_subclass.name && inventory_type.name) {
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
                        purchase_price: parseFloat((purchase_price/10000).toFixed(2)),
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
                ).then(i => console.info(`C,${i._id}`)).catch(e=>(e))
            } else {
                console.info(`E,${item_id}`)
            }
        };
        if (isNew) {
            for (let item_id = 0; item_id < 250000; item_id++) {
                await getItemById(item_id)
            }
        } else {
            const items = items_db.find({}).lean().cursor();
            for (let item = await items.next(); item != null; item = await items.next()) {
                await getItemById(item._id)
            }
        }
        connection.close();
        console.timeEnd(`DMA-${getItems.name}`);
    } catch (err) {
        console.error(`${getItems.name},${err}`);
    }
}

getItems({ tags: `DMA` }, false);