const fs = require('fs');
const items_db = require("../../db/items_db");
const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');

//TODO documentation

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
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await professions_db.findByIdAndUpdate(parseInt(`51005${item_id}${reagents}`),
                        {
                                _id: parseInt(`51005${item_id}${itemID}`),
                                spell_id: 51005,
                                item_id: item_id,
                                item_quantity: 1,
                                reagents: [{_id: itemID, quantity: item_quantity}],
                                profession: 'INSC'
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
                connection.close();
                break;
            case 'jwc':
                lua = fs.readFileSync(path+'Prospect.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:') && item_id) {
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await professions_db.findByIdAndUpdate(parseInt(`31252${item_id}${reagents}`),
                            {
                                _id: parseInt(`31252${item_id}${itemID}`),
                                spell_id: 31252,
                                item_id: item_id,
                                item_quantity: 1,
                                reagents: [{_id: itemID, quantity: item_quantity}],
                                profession: 'JWLC'
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
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await professions_db.findByIdAndUpdate(parseInt(`${item_id}${itemID}`),
                            {
                                _id: parseInt(`${item_id}${itemID}`),
                                spell_id: parseInt(`${item_id}${itemID}`),
                                item_id: item_id,
                                item_quantity: 1,
                                reagents: [{_id: itemID, quantity: item_quantity}],
                                profession: 'TRANSFORM'
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
                            name = {};
                            let item_ = await items_db.findById(item_id);
                            if (item_) {
                                name.en_GB = `Milling ${item_.name.en_GB}`;
                                name.ru_RU = `Распыление ${item_.name.ru_RU}`;
                            }
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            console.log({
                                _id: parseInt(`51005${item_id}${itemID}`),
                                name: name,
                                spell_id: 51005,
                                item_id: item_id,
                                item_quantity: 1,
                                reagents: [{_id: itemID, quantity: item_quantity}],
                                profession: 'TRANS'
                            });
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

fromLua('C:\\', 'dev');