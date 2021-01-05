const mongoose = require('mongoose');

/**
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 *
 */

const schema = new mongoose.Schema(
  {
    _id: Number,
    effect: Number,
    item_id: {
        type: Number,
        index: true
    },
    item_quantity: Number,
    spell_id: {
        type: Number,
        index: true
    },
  }
);

const skill_line = mongoose.model('skill_effect', schema, 'skill_effect');

module.exports = skill_line;
