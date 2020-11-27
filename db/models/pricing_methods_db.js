const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    /** API or LOCAL */
    ticker: {
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
    /** API or LOCAL */
    item_id: {
      type: Number,
      required: true,
    },
    /**
     * LOCAL, see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
     * SkillLineAbility.lua
     */
    item_quantity: {
      type: Number,
      default: 0
    },
    recipe_id: {
      type: Number,
      required: true,
    },
    spell_id: {
      type: Number,
    },
    /**
     * API or LOCAL
     * {id: Number, Quantity: Number}
     */
    reagents: [
      {
        _id: Number,
        quantity: Number,
      },
    ],
    modified_crafting_slots: [
      {
        _id: Number,
        name: Object,
        display_order: Number
      }
    ],
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
      enum: ['primary', 'derivative', 'u/r'],
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
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
schema.index({ recipe_id: -1 }, { name: 'recipe_ID' });
schema.index({ item_id: -1 }, { name: 'itemID' });
schema.index({ spell_id: -1 }, { name: 'spellID' });

let pricing_methods_db = mongoose.model(
  'pricing_methods',
  schema,
  'pricing_methods',
);

module.exports = pricing_methods_db;
