/**
 * Mongo Models
 */
require('../../../db/connection')
const items_db = require('../../../db/models/items_db');
const pricing_methods_db = require('../../../db/models/pricing_methods_db');

/**
 * Modules
 */

const fs = require('fs');

/***
 *
 * This function imports data (probability rates) from TradeSkillMaster
 * Mill.lua, Transform.lua, Prospect.lua directly to DMA-pricing_methods
 *
 * @param path {string}
 * @param pricing_methods {[string]}
 * @returns {Promise<void>}
 */

async function indexMethodsTSM (path, pricing_methods= []) {
  try {

    if (!pricing_methods.length) return

    if (pricing_methods.includes('insc')) {
      let item_id;
      const lua = fs.readFileSync(path + 'Mill.lua', 'utf8');
      const stringArray = lua.match(/\[(.*)/gm);
      for (let string of stringArray) {
        if (string.includes(' = {')) {
          item_id = parseInt(string.replace(/\D/g, ''));
        } else {
          if (string.includes('["i:') && item_id) {
            const item = await items_db.findById(item_id);
            const name = {};
            if (item) {
              name.en_GB = `Milling ${item.name.en_GB}`;
              name.ru_RU = `Распыление ${item.name.ru_RU}`;
            }
            const itemID = parseInt(string.match('\\["i:(.*?)\\"]')[1]);
            const item_quantity = parseFloat(string.match('\\ = (.*?)\\,')[1]);
            if (item && item_id) {
              console.log(item, item_id)
              /*await pricing_methods_db.findByIdAndUpdate(
                `P51005${item_id}${itemID}`,
                {
                  _id: `P51005${item_id}${itemID}`,
                  recipe_id: parseInt(`51005${item_id}${itemID}`),
                  spell_id: 51005,
                  media:
                    'https://render-eu.worldofwarcraft.com/icons/56/ability_miling.jpg',
                  item_id: item_id,
                  item_quantity: 1,
                  reagents: [
                    {
                      _id: itemID,
                      quantity: Number((1 / item_quantity).toFixed(3)),
                    },
                  ],
                  profession: 'INSC',
                  type: `primary`,
                  createdBy: `DMA-${indexMethodsTSM.name}`,
                  updatedBy: `DMA-${indexMethodsTSM.name}`,
                },
                {
                  upsert: true,
                  new: true,
                  setDefaultsOnInsert: true,
                  runValidators: true,
                  lean: true,
                },
              ).then(doc => console.info(doc));*/
            }
          }
        }
      }
    }

    /*switch (expr) {
      case 'jwlc':
        lua = fs.readFileSync(path + 'Prospect.lua', 'utf8');
        stringArray = lua.match(/\[(.*)/gm);
        for (let string of stringArray) {
          if (string.includes(' = {')) {
            //FIXME jwc schema fix
            item_id = parseInt(string.replace(/\D/g, ''));
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
                await pricing_methods
                  .findByIdAndUpdate(
                    `P31252${item_id}${itemID}`,
                    {
                      _id: `P31252${item_id}${itemID}`,
                      recipe_id: parseInt(`31252${item_id}${itemID}`),
                      spell_id: 31252,
                      media:
                        'https://render-eu.worldofwarcraft.com/icons/56/inv_misc_gem_bloodgem_01.jpg',
                      item_id: item_id,
                      item_quantity: 1,
                      reagents: [
                        {
                          _id: itemID,
                          quantity: Number((1 / item_quantity).toFixed(3)),
                        },
                      ],
                      profession: 'JWLC',
                      type: `primary`,
                      createdBy: `DMA-${indexMethodsTSM.name}`,
                      updatedBy: `DMA-${indexMethodsTSM.name}`,
                    },
                    {
                      upsert: true,
                      new: true,
                      setDefaultsOnInsert: true,
                      runValidators: true,
                      lean: true,
                    },
                  )
                  .then(doc => console.info(doc));
              }
            }
          }
        }
        break;
      case 'transform':
        lua = fs.readFileSync(path + 'Transform.lua', 'utf8');
        stringArray = lua.match(/\[(.*)/gm);
        for (let string of stringArray) {
          if (string.includes(' = {')) {
            item_id = parseInt(string.replace(/\D/g, ''));
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
                await pricing_methods
                  .findByIdAndUpdate(
                    `P${item_id}${itemID}`,
                    {
                      _id: `P${item_id}${itemID}`,
                      recipe_id: parseInt(`${item_id}${itemID}`),
                      media:
                        'https://render-eu.worldofwarcraft.com/icons/56/trade_engineering.jpg',
                      spell_id: parseInt(`${item_id}${itemID}`),
                      item_id: item_id,
                      item_quantity: 1,
                      reagents: [
                        {
                          _id: itemID,
                          quantity: Number((1 / item_quantity).toFixed(3)),
                        },
                      ],
                      profession: 'TRANSFORM',
                      type: `primary`,
                      createdBy: `DMA-${indexMethodsTSM.name}`,
                      updatedBy: `DMA-${indexMethodsTSM.name}`,
                    },
                    {
                      upsert: true,
                      new: true,
                      setDefaultsOnInsert: true,
                      runValidators: true,
                      lean: true,
                    },
                  )
                  .then(doc => console.info(doc));
              }
            }
          }
        }
        break;
      case 'dev':
        console.log(path + 'Mill.lua');
        lua = fs.readFileSync(path + 'Mill.lua', 'utf8');
        stringArray = lua.match(/\[(.*)/gm);
        for (let string of stringArray) {
          if (string.includes(' = {')) {
            item_id = parseInt(string.replace(/\D/g, ''));
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
                  media:
                    'https://render-eu.worldofwarcraft.com/icons/56/trade_engineering.jpg',
                  name: name,
                  item_id: item_id,
                  item_quantity: 1,
                  spell_id: 51005,
                  reagents: [
                    {
                      _id: itemID,
                      quantity: Number((1 / item_quantity).toFixed(3)),
                    },
                  ],
                  profession: 'TRANS',
                  type: `primary`,
                  createdBy: `DMA-${indexMethodsTSM.name}`,
                  updatedBy: `DMA-${indexMethodsTSM.name}`,
                });
              }
            }
          }
        }
        break;
      default:
        console.info('Sorry, we got nothing');
    }*/
  } catch (error) {
    console.error(error);
  }
}

indexMethodsTSM('C:\\', ['insc']);
