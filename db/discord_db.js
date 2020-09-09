const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    coverage: {
      realm: String,
      ilvl: Number
    },
    channel: {
      id: String,
      name: String,
    },
  },
  {
    timestamps: true,
  },
);

let discord = mongoose.model('discord', schema, 'discord');

module.exports = discord;
