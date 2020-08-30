const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

/*require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});*/

let schema = new mongoose.Schema(
  {
    /**
     * From Battle.Net ?
     */
    _id: {
      type: Number,
    },
    name: {
      type: String,
    },
    battle_pet_type: {
      type: String,
    },
    description: {
      type: String,
    },
    abilities: {
      type: Array
    },
    properties: {
      is_capturable: Boolean,
      is_tradable: Boolean,
      is_battlepet: Boolean,
      is_alliance_only: Boolean,
      is_horde_only: Boolean,
      is_random_creature_display: Boolean,
    },
    source: {
      type: String,
    },
    icon: {
      type: String
    },
    creature_id: {
      type: Number
    },
    media_id: {
      type: Number
    },
    /**
     * CreatureXDisplayInfo.db2 id as item.modifier.value = 6
     */
    display_id: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ 'creature_id': 1, }, { name: 'CreatureID' });

let pets_db = mongoose.model('pets', schema, 'pets');

module.exports = pets_db;
