const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    /** API or LOCAL */
    _id: {
      type: String,
    },
    /** API */
    name: {
      type: Object,
    },
    description: {
      type: Object,
    },
    media: {
      type: String,
    },
    horde_item_id: {
      type: Number,
    },
    alliance_item_id: {
      type: Number,
    },
    /** API or LOCAL */
    item_id: {
      type: Number,
    },
    item_quantity: {
      type: Number,
    },
    /**
     * LOCAL, see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
     * SkillLineAbility.lua
     */
    recipe_id: {
      type: Number,
    },
    spell_id: {
      type: Number,
    },
    /**
     * API or LOCAL
     * {id: Number, Quantity: Number}
     */
    reagents: {
      type: [
        {
          _id: Number,
          quantity: Number,
        },
      ],
    },
    /** if Local then Convert from SkillLine */
    profession: {
      type: String,
    },
    /** API */
    expansion: {
      type: String,
    },
    rank: {
      type: Number,
    },
    type: {
      type: String,
      required: true,
      enum: ['primary', 'derivative'],
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
    reagent_items: {
      type: Array,
    },
    /**
     * IVA, store item_id for singleName
     */
    single_name: {
      Number,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ item_id: -1, type: 1 }, { name: 'getPricingMethod' });
schema.index({ item_id: -1 }, { name: 'itemID' });
schema.index({ horde_item_id: -1 }, { name: 'Horde_itemID' });
schema.index({ alliance_item_id: -1 }, { name: 'Alliance_itemID' });
schema.index({ spell_id: -1 }, { name: 'spellID' });

let pricing_methods_db = mongoose.model(
  'pricing_methods',
  schema,
  'pricing_methods',
);

module.exports = pricing_methods_db;
