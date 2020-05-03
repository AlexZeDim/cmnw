const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

/***
 * TODO as migrations
 * @returns {Promise<void>}
 */

async function migrations() {
    try {
        let enchant = await pricing_methods.updateMany({ profession: "ENCH", item_quantity: 0 },{ item_quantity: 1 });
        console.info(enchant);
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