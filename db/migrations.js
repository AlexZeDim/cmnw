/**
 * Mongo Models
 */
require('./connection')
const items_db = require('./models/items_db');
const characters_db = require('./models/characters_db');
const personalities_db = require('./models/personalities_db');
const realms_db = require('./models/realms_db');
const guilds_db = require('./models/guilds_db');
const auctions_db = require('./models/auctions_db');
const pricing_methods_db = require('./models/pricing_methods_db');

(async () => {
  try {
    /**
     * Remove field via $unset
     */
    /*
    const unset = await characters_db.updateMany(
      {},
      {
        $unset:
          {
            isWatched: 1
          }
      }
    );
    console.log(unset)
    */

    /**
     * UpdateMany
     */
    /*
    const updMany = await characters_db.updateMany(
      {},
      [
        {
          $set: {
            hash_a: "$hash.a",
            hash_b: "$hash.b",
            hash_f: "$hash.f",
            hash_t: "$hash.t",
            average_item_level: "$ilvl.avg",
            equipped_item_level: "$ilvl.eq"
          }
        }
      ]
    );
    console.log(updMany)
    */

    /**
     * Remove documents
     */
    /*
    const remove = await characters_db.deleteMany({ hash_a: null, statusCode: { $ne: 200 } })
    console.log(remove)
    */

    /**
     * Rename field in a collection
     */
    /*
    const refactoring = await items.updateMany({},{ $rename: { "v_class": "asset_class" } });
    console.log(refactoring)
    */

    /**
     * FIX BFA vendor price, cause it's for a full quantity, not x1
     * @type {({quantity: number, _id: number})[]}
     */
    /*
    const array_of_vendor = [
      { _id: 160398, quantity: 10 },
      { _id: 160399, quantity: 10 },
      { _id: 160400, quantity: 3 },
      { _id: 160709, quantity: 10 },
      { _id: 160710, quantity: 10 },
      { _id: 160712, quantity: 10 },
      { _id: 163569, quantity: 5 },
      { _id: 158186, quantity: 20 },
    ];
    for (let i of array_of_vendor) {
      let item = await items.findById(i._id);
      item.purchase_price = item.purchase_price / i.quantity;
      await item.save();
    }
    */
    /**
     * Enchanting recipes has quantity 0, but actually they gave us one scroll
     */
    /*
    const enchant = await pricing_methods.updateMany(
      { profession: 'ENCH', item_quantity: 0 },
      { item_quantity: 1 },
    );
    console.info(enchant);
    */
    /**
     * Destroying expulsom as a pricing_method
     * @type {({profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number}|{profession: string, updatedBy: string, item_id: number, description: {ru_RU: string, en_GB: string}, spell_id: number, type: string, expansion: string, recipe_id: number, createdBy: string, name: {ru_RU: string, en_GB: string}, _id: string, reagents: [{quantity: number, _id: number}], item_quantity: number})[]}
     */
    /*
    const expulsom_methods = [
      {
        _id: 'P38737:1',
        description: {
          en_GB: 'Scrap Monel-Hardened Armguards into Expulsom',
          ru_RU: 'Распылить укрепленные монелитом боевые наручи в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'BSMT',
        spell_id: 253183,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 38737,
        reagents: [{ _id: 161887, quantity: 6.5 }],
      },
      {
        _id: 'P38737:2',
        description: {
          en_GB: 'Scrap Monel-Hardened Armguards into Expulsom',
          ru_RU: 'Распылить укрепленные монелитом боевые наручи в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'BSMT',
        spell_id: 253183,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 38737,
        reagents: [{ _id: 152809, quantity: 6.5 }],
      },
      {
        _id: 'P39083:1',
        description: {
          en_GB: 'Scrap Tidespray Linen Bracers into Expulsom',
          ru_RU: 'Распылить Наручи из морского льна в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'CLTH',
        spell_id: 257103,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39083,
        reagents: [{ _id: 161984, quantity: 6.5 }],
      },
      {
        _id: 'P39083:2',
        description: {
          en_GB: 'Scrap Tidespray Linen Bracers into Expulsom',
          ru_RU: 'Распылить Наручи из морского льна в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'CLTH',
        spell_id: 257103,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39083,
        reagents: [{ _id: 154692, quantity: 6.5 }],
      },
      {
        _id: 'P39045:1',
        description: {
          en_GB: 'Scrap Shimmerscale Armguards into Expulsom',
          ru_RU: 'Распылить Наручи из морского льна в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'LTHR',
        spell_id: 256757,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39045,
        reagents: [{ _id: 161960, quantity: 6.5 }],
      },
      {
        _id: 'P39045:2',
        description: {
          en_GB: 'Scrap Shimmerscale Armguards into Expulsom',
          ru_RU: 'Распылить Наручи из морского льна в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'LTHR',
        spell_id: 256757,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39045,
        reagents: [{ _id: 154153, quantity: 6.5 }],
      },
      {
        _id: 'P39031:1',
        description: {
          en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
          ru_RU: 'Распылить Боевые наручи из шершавой кожи в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'LTHR',
        spell_id: 256756,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39031,
        reagents: [{ _id: 161945, quantity: 6.5 }],
      },
      {
        _id: 'I39031:2',
        description: {
          en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
          ru_RU: 'Распылить Боевые наручи из шершавой кожи в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'LTHR',
        spell_id: 256756,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39031,
        reagents: [{ _id: 154145, quantity: 6.5 }],
      },
      {
        _id: 'P39538:1',
        description: {
          en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
          ru_RU: 'Распылить Мрачный жезл зачаровывателя в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'ENCH',
        spell_id: 265106,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39538,
        reagents: [{ _id: 161925, quantity: 5 }],
      },
      {
        _id: 'P39538:2',
        description: {
          en_GB: 'Scrap Coarse Leather Armguards into Expulsom',
          ru_RU: 'Распылить Мрачный жезл зачаровывателя в Дистилиум',
        },
        expansion: 'BFA',
        item_id: 152668,
        name: {
          en_GB: 'Expulsom',
          ru_RU: 'Дистилиум',
        },
        profession: 'ENCH',
        spell_id: 265106,
        item_quantity: 1,
        createdBy: 'DMA-migrations',
        type: 'primary',
        updatedBy: 'DMA-migrations',
        recipe_id: 39538,
        reagents: [{ _id: 152872, quantity: 5 }],
      },
    ];
    for (let expulsom_method of expulsom_methods) {
      await pricing_methods
        .findByIdAndUpdate(
          {
            _id: expulsom_method._id,
          },
          expulsom_method,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            lean: true,
          },
        )
        .then(doc => console.info(doc._id));
    }*/
  } catch (err) {
    console.error(err);
  }
})();
