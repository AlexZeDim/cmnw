const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    discord_id: String,
    discord_name: String,
    channel_id: String,
    channel_name: String,
    type: {
      type: String,
      enum: ['recruiting', 'orders', 'marketdata'],
      lowercase: true,
      required: true,
    },
    message_sent: {
      type: Number,
      default: 0,
    },
    lang: String,
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
      item_level: Number,
      days_from: Number,
      days_to: Number,
      language: [String],
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
