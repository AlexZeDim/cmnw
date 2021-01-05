const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    _id: Number,
    level: Number,
    azerite_tier_unlock_id: Number,
    name: String,
    ilevel: String,
    tag: String,
    quality: Number,
    curveId: Number,
    rawStats: Array,
    stats: String,
    socket: Number,
    effect: Object,
  },
  {
    timestamps: true,
  },
);

const bonus_lists_db = mongoose.model('bonus_lists', schema, 'bonus_lists');

module.exports = bonus_lists_db;
