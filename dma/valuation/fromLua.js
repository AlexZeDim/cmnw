const fs = require('fs');
const pricing_db = require("../../db/pricing_db");
const {connection} = require('mongoose');

//TODO documentation

async function fromLua (path, expr) {
    try {
        let item_id, itemID, item_quantity, stringArray, lua;
        switch (expr) {
            case 'insc':
                lua = fs.readFileSync(path+'Mill.lua','utf8');
                stringArray = lua.match(/\[(.*)/gm);
                for (let string of stringArray) {
                    if (string.includes(' = {')) {
                        item_id = parseInt(string.replace(/\D/g, ""));
                    } else {
                        if (string.includes('["i:')) {
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await pricing_db.findByIdAndUpdate(parseInt(`51005${item_id}${reagents}`),
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
                        if (string.includes('["i:')) {
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await pricing_db.findByIdAndUpdate(parseInt(`31252${item_id}${reagents}`),
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
                        if (string.includes('["i:')) {
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            await pricing_db.findByIdAndUpdate(parseInt(`${item_id}${itemID}`),
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
                        if (string.includes('["i:')) {
                            itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
                            item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
                            console.log({
                                _id: parseInt(`51005${item_id}${itemID}`),
                                spell_id: 51005,
                                item_id: item_id,
                                item_quantity: 1,
                                reagents: [{_id: itemID, quantity: item_quantity}],
                                quantity: 1,
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

fromLua('C:\\', 'insc');