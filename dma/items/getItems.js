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
const { Round2 } = require("../../db/setters");

/**
 *  Modules
 */
const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * This function parse items across B.net API with wrapper
 * @param queryKeys {object}
 * @param update {boolean}
 * @returns {Promise<void>}
 */

async function getItems (queryKeys = { tags: `DMA` }, update = true) {
    try {
        console.time(`DMA-${getItems.name}`);

        const locale = "en_GB"
        const { _id, secret, token } = await keys_db.findOne(queryKeys);

        /**
         * B.net API wrapper
         */
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', '');

        const getItemById = async (item_id = 25) => {

            /** Check is exits */
            let item = await items_db.findById(item_id)

            /** Request item data */
            const [getItem, getMedia] = await Promise.allSettled([
                bnw.WowGameData.getItem(item_id).catch(e => (e)),
                bnw.WowGameData.getItemMedia(item_id).catch(e => (e)),
            ]);

            /** If not, create */
            if (!item) {
                item = new items_db({
                    _id: item_id,
                });
            }

            if (getItem.value) {

                /** Schema fields */
                const fields = [
                    "quality",
                    "item_class",
                    "item_subclass",
                    "inventory_type",
                ];
                const gold = [
                    "purchase_price",
                    "sell_price"
                ];

                /** key value */
                for (const [key] of Object.entries(getItem.value)) {
                    /** Loot type */
                    if (key === "preview_item") {
                        if ("binding" in getItem.value[key]) {
                            item.loot_type = getItem.value[key].binding.type;
                        }
                    }

                    if (fields.some(f => f === key)) {
                        item[key] = getItem.value[key].name[locale]
                    } else {
                        item[key] = getItem.value[key]
                    }
                    if (gold.some(f => f === key)) {
                        if (key === "sell_price") {
                            item.asset_class.addToSet("VSP")
                        }
                        item[key] = Round2(getItem.value[key]/10000)
                    }
                }

                /** Icon media */
                if (getMedia.value && getMedia.value.assets && getMedia.value.assets.length) {
                    item.icon = getMedia.value.assets[0].value
                }

                await item.save();
            }
        };

        if (update) {
            for (let item_id = 25; item_id < 230000; item_id++) {
                await getItemById(item_id)
            }
        } else {
            await items_db.find({}).lean().cursor({batchSize: 10}).eachAsync(async ({_id}) => {
                await getItemById(_id)
            }, { parallel: 10 })
        }
        /**
         * TODO After updateMany purchase_price/purchase_quantity
         */
        connection.close();
        console.timeEnd(`DMA-${getItems.name}`);
    } catch (err) {
        console.error(`${getItems.name},${err}`);
    }
}

getItems({ tags: `DMA` }, true);