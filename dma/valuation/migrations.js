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

const items = require("../../db/items_db");
const pricing_methods = require("../../db/pricing_methods_db");


/***
 * Fixes vendor sell quantity problem for some items (Boralus vendor)
 * FIXME EXPL horde_item_id & alliance_item_id
 * Add methods for EXPL
 * @returns {Promise<void>}
 */

async function migrations() {
    try {
        /**
         * Remove field via $unset
         */
        /*
        let unset = await items.updateMany({}, {$unset:{"asset_class":1}});
        console.log(unset)
        */

        /**
         * Rename field in a collection
         */
        /*
        let refactoring = await items.updateMany({},{ $rename: { "v_class": "asset_class" } });
        console.log(refactoring)
        */

        /**
         * FIX BFA vendor price, cause it's for a full quantity, not x1
         * @type {({quantity: number, _id: number})[]}
         */
        let array_of_vendor = [
            {_id: 160398, quantity: 10},
            {_id: 160399, quantity: 10},
            {_id: 160400, quantity: 3},
            {_id: 160709, quantity: 10},
            {_id: 160710, quantity: 10},
            {_id: 160712, quantity: 10},
            {_id: 163569, quantity: 5},
            {_id: 158186, quantity: 20},
        ];
        for (let item of array_of_vendor) {
            let i = await items.findById(item._id);
            console.log(i);
            //await items.findByIdAndUpdate(item._id, {purchase_price: purchase_price/item.quantity});
        }
        /**
         * Enchanting recipes has quantity 0, but actually they gave us one scroll
         */
        let enchant = await pricing_methods.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 });
        console.info(enchant);
        /**
         * Destroying expulsom as a pricing_method
         * @type {({profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number})[]}
         */
        let expulsom_methods = [
            {
                _id: 'P38737:1',
                description: {
                    en_GB: 'Scrap Monel-Hardened Armguards into Expulsom',
                    ru_RU: 'Распылить укрепленные монелитом боевые наручи в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'BSMT',
                spell_id: 253183,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 38737,
                reagents: [
                    { _id: 161887, quantity: 6.5 }
                ]
            },
/*            {
                _id: 'P38737:2',
                description: {
                    en_GB: 'Scrap Monel-Hardened Armguards into Expulsom',
                    ru_RU: 'Распылить укрепленные монелитом боевые наручи в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'BSMT',
                spell_id: 253183,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 38737,
                reagents: [
                    { _id: 152809, quantity: 6.5 }
                ]
            },*/
            {
                _id: 'P39083:1',
                description: {
                    en_GB: 'Scrap Tidespray Linen Bracers into Expulsom',
                    ru_RU: 'Распылить Наручи из морского льна в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'CLTH',
                spell_id: 257103,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39083,
                reagents: [
                    { _id: 161984, quantity: 6.5 }
                ]
            },
/*            {
                _id: 'P39083:2',
                description: {
                    en_GB: 'Scrap Tidespray Linen Bracers into Expulsom',
                    ru_RU: 'Распылить Наручи из морского льна в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'CLTH',
                spell_id: 257103,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39083,
                reagents: [
                    { _id: 154692, quantity: 6.5 }
                ]
            },*/
            {
                _id: 'P39045:1',
                description: {
                    en_GB: 'Scrap Shimmerscale Armguards into Expulsom',
                    ru_RU: 'Распылить Наручи из морского льна в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'LTHR',
                spell_id: 256757,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39045,
                reagents: [
                    { _id: 161960, quantity: 6.5 }
                ]
            },
/*            {
                _id: 'P39045:2',
                description: {
                    en_GB: 'Scrap Shimmerscale Armguards into Expulsom',
                    ru_RU: 'Распылить Наручи из морского льна в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'LTHR',
                spell_id: 256757,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39045,
                reagents: [
                    { _id: 154153, quantity: 6.5 }
                ]
            },*/
            {
                _id: 'P39031:1',
                description: {
                    en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
                    ru_RU: 'Распылить Боевые наручи из шершавой кожи в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'LTHR',
                spell_id: 256756,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39031,
                reagents: [
                    { _id: 161945, quantity: 6.5 }
                ]
            },
/*            {
                _id: 'I39031:2',
                description: {
                    en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
                    ru_RU: 'Распылить Боевые наручи из шершавой кожи в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'LTHR',
                spell_id: 256756,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39031,
                reagents: [
                    { _id: 154145, quantity: 6.5 }
                ]
            },*/
            {
                _id: 'P39538:1',
                description: {
                    en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
                    ru_RU: 'Распылить Мрачный жезл зачаровывателя в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'ENCH',
                spell_id: 265106,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39538,
                reagents: [
                    { _id: 161925, quantity: 5 }
                ]
            },
/*            {
                _id: 'P39538:2',
                description: {
                    en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
                    ru_RU: 'Распылить Мрачный жезл зачаровывателя в Дистилиум'
                },
                expansion: 'BFA',
                item_id: 152668,
                name: {
                    en_GB: 'Expulsom',
                    ru_RU: 'Дистилиум'
                },
                profession: 'ENCH',
                spell_id: 265106,
                item_quantity: 1,
                createdBy: 'DMA-migrations',
                type: 'primary',
                updatedBy: 'DMA-migrations',
                recipe_id: 39538,
                reagents: [
                    { _id: 152872, quantity: 5 }
                ]
            },*/
        ];
       for (let expulsom_method of expulsom_methods) {
            await pricing_methods.findByIdAndUpdate(
                {
                    _id: expulsom_method._id
                },
                expulsom_method,
                {
                    upsert : true,
                    new: true,
                    setDefaultsOnInsert: true,
                    lean: true
                }
            ).then(doc => console.info(doc._id));
        }
        connection.close();
    } catch (err) {
        console.error(err);
    }
}

migrations();