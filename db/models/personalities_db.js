const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    cryptonym: {
      type: String,
      default: 'Unknown',
      required: true,
    },
    clearance: [
      {
        _id: false,
        level: {
          type: Number,
          enum: [
            0,
            1,
            2,
            3,
          ],
          default: 0,
        },
        access: {
          type: String,
          default: 'WoW',
        },
      },
    ],
    aliases: [
      {
        _id: false,
        type: {
          type: String,
          enum: [
            'discord',
            'battle.tag',
            'twitter',
            'name',
            'character',
            'nickname',
            'codename',
          ],
          required: true,
        },
        value: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

schema.index({ 'aliases.type': 1, 'aliases.value': 1 }, { name: 'Aliases' });

const personalities_db = mongoose.model('personalities', schema, 'personalities');

module.exports = personalities_db;
