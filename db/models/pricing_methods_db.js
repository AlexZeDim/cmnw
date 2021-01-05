const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    /** API or LOCAL */
    ticker: String,
    /** API */
    name: Object,
    description: Object,
    media: String,
    /**
     * API or LOCAL
     *
     * SkillLineAbility.lua
     * see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
     *
     * Build from item_id & item_quantity
     * for massive proportion evaluation
     */
    derivatives: [
      {
        _id: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 0
        },
      },
    ],
    recipe_id: {
      type: Number,
      required: true,
    },
    spell_id: Number,
    /**
     * API or LOCAL
     * {id: Number, Quantity: Number}
     */
    reagents: [
      {
        _id: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 0
        },
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
    profession: String,
    /** API */
    expansion: String,
    rank: Number,
    type: {
      type: String,
      required: true,
      enum: ['primary', 'derivative', 'u/r'],
    },
    createdBy: String,
    updatedBy: String,
    /**
     * IVA, store item_id for singleName
     */
    single_premium: Number
  },
  {
    timestamps: true,
  },
);

schema.index({ item_id: -1, type: 1 }, { name: 'getPricingMethod' });
schema.index({ recipe_id: -1 }, { name: 'recipe_ID' });
schema.index({ item_id: -1 }, { name: 'itemID' });
schema.index({ spell_id: -1 }, { name: 'spellID' });

const pricing_methods_db = mongoose.model('pricing_methods', schema, 'pricing_methods');

module.exports = pricing_methods_db;
