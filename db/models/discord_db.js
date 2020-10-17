const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    channels: [{
      _id: String,
      name: String,
      filters: {
        realm: [String],
        faction: String,
        ilvl: Number,
        days_from: Number,
        wcl: Number,
        rio: Number,
        character_class: [String],
      }
    }]
  },
  {
    timestamps: true,
  },
);

let discord = mongoose.model('discord', schema, 'discord');

module.exports = discord;
