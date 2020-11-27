const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

/**
 * ID - recipeID
 * spell_id - spellID
 */

const schema = new mongoose.Schema(
  {
    _id: Number,
    spell_id: {
      type: Number,
      index: true
    },
    reagents: [
      {
        _id: Number,
        quantity: Number,
      }
    ]
  }
);

const spell_reagents = mongoose.model('spell_reagents', schema, 'spell_reagents');

module.exports = spell_reagents;
