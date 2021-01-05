const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    discord_id: String,
    discord_name: String,
    channel_id: String,
    channel_name: String,
    type: {
      type: String,
      enum: ['recruiting', 'orders', 't&s'],
      default: 'recruiting',
      required: true,
    },
    message_sent: {
      type: Number,
      default: 0,
    },
    fault_tolerance: Number,
    filters: {
      items: [Number],
      realms: [Number],
      timestamps: [
        {
          _id: Number,
          auctions: Number
        }
      ],
      faction: String,
      ilvl: Number,
      days_from: Number,
      wcl: Number,
      rio: Number,
      character_class: [String],
    },
  },
  {
    timestamps: true,
  },
);

const discord = mongoose.model('discord', schema, 'discord');

module.exports = discord;
