const fs = require('fs');
const items_db = require("../../db/items_db");
const pricing_methods = require("../../db/pricing_methods_db");
const {connection} = require('mongoose');

/***
 *
 * This function imports data (probability rates) from TradeSkillMaster
 * Mill.lua, Transform.lua, Prospect.lua directly to DMA-pricing_methods
 *
 * @param path
 * @param expr
 * @returns {Promise<void>}
 */

async function fromLua (path, expr) {
    try {
        let item_id, name, itemID, item_quantity, stringArray, lua;
        switch (expr) {
            case 'insc':
                lua = fs.readFileSync(path+'Mill.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:') && item_id) {
                            let item_ = await items_db.findById(item_id);
                            name = {};
                            if (item_) {
                                name.en_GB = `Milling ${item_.name.en_GB}`;
                                name.ru_RU = `Распыление ${item_.name.ru_RU}`;
                            }
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            if (item_ && item_id) {
                                await pricing_methods.findByIdAndUpdate(parseInt(`51005${item_id}${itemID}`),
                                {
                                    _id: `P51005${item_id}${itemID}`,
                                    recipe_id: parseInt(`51005${item_id}${itemID}`),
                                    spell_id: 51005,
                                    media: 'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg',
                                    item_id: item_id,
                                    item_quantity: 1,
                                    reagents: [{_id: itemID, quantity: item_quantity}],
                                    profession: 'INSC',
                                    type: `primary`,
                                    createdBy: `DMA-${fromLua.name}`,
                                    updatedBy: `DMA-${fromLua.name}`
                                }, {
                                    upsert : true,
                                    new: true,
                                    setDefaultsOnInsert: true,
                                    runValidators: true,
                                    lean: true
                                }).then(doc => console.info(doc));
                            }
                        }
                    }
                }
                connection.close();
                break;
            case 'jwlc':
                lua = fs.readFileSync(path+'Prospect.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:') && item_id) {
                            let item_ = await items_db.findById(item_id);
                            name = {};
                            if (item_) {
                                name.en_GB = `Prospecting ${item_.name.en_GB}`;
                                name.ru_RU = `Просеивание ${item_.name.ru_RU}`;
                            }
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            if (item_ && item_id) {
                                await pricing_methods.findByIdAndUpdate(parseInt(`31252${item_id}${itemID}`),
                                {
                                    _id: `P31252${item_id}${itemID}`,
                                    recipe_id: parseInt(`31252${item_id}${itemID}`),
                                    spell_id: 31252,
                                    media: 'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_gem_bloodgem_01.jpg',
                                    item_id: item_id,
                                    item_quantity: 1,
                                    reagents: [{_id: itemID, quantity: item_quantity}],
                                    profession: 'JWLC',
                                    type: `primary`,
                                    createdBy: `DMA-${fromLua.name}`,
                                    updatedBy: `DMA-${fromLua.name}`
                                }, {
                                    upsert : true,
                                    new: true,
                                    setDefaultsOnInsert: true,
                                    runValidators: true,
                                    lean: true
                                }).then(doc => console.info(doc));
                            }
                        }
                    }
                }
                connection.close();
                break;
            case 'transform':
                lua = fs.readFileSync(path+'Transform.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:') && item_id) {
                            let item_ = await items_db.findById(item_id);
                            name = {};
                            if (item_) {
                                name.en_GB = `Transform ${item_.name.en_GB}`;
                                name.ru_RU = `Превращение ${item_.name.ru_RU}`;
                            }
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            if (item_ && item_id) {
                                await pricing_methods.findByIdAndUpdate(parseInt(`${item_id}${itemID}`),
                                    {
                                    _id: `P${item_id}${itemID}`,
                                    recipe_id: parseInt(`${item_id}${itemID}`),
                                    media: 'https://render-eu.worldofwarcraft.com/icons/56/trade_engineering.jpg',
                                    spell_id: parseInt(`${item_id}${itemID}`),
                                    item_id: item_id,
                                    item_quantity: 1,
                                    reagents: [{_id: itemID, quantity: item_quantity}],
                                    profession: 'TRANSFORM',
                                    type: `primary`,
                                    createdBy: `DMA-${fromLua.name}`,
                                    updatedBy: `DMA-${fromLua.name}`
                                }, {
                                    upsert : true,
                                    new: true,
                                    setDefaultsOnInsert: true,
                                    runValidators: true,
                                    lean: true
                                }).then(doc => console.info(doc));
                            }
                        }
                    }
                }
                break;
            case 'dev':
                console.log(path+'Transform.lua');
                lua = fs.readFileSync(path+'Transform.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:') && item_id) {
                            let item_ = await items_db.findById(item_id);
                            name = {};
                            if (item_) {
                                name.en_GB = `Milling ${item_.name.en_GB}`;
                                name.ru_RU = `Распыление ${item_.name.ru_RU}`;
                            }
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            if (item_ && item_id) {
                                console.log({
                                    _id: `P51005${item_id}${itemID}`,
                                    recipe_id: parseInt(`51005${item_id}${itemID}`),
                                    media: 'https://render-eu.worldofwarcraft.com/icons/56/trade_engineering.jpg',
                                    name: name,
                                    item_id: item_id,
                                    item_quantity: 1,
                                    spell_id: 51005,
                                    reagents: [{_id: itemID, quantity: item_quantity}],
                                    profession: 'TRANS',
                                    type: `primary`,
                                    createdBy: `DMA-${fromLua.name}`,
                                    updatedBy: `DMA-${fromLua.name}`
                                });
                            }
                        }
                    }
                }
                break;
            default:
                console.info('Sorry, we got nothing');
        }
    } catch (error) {
        console.error(error);
    }
}

fromLua('C:\\', 'transform');