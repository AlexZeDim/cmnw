const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    _id: Number,
    region: {
      type: String,
      enum: ['eu', 'us'],
    },
    price: Number,
    lastModified: Date,
  },
  {
    timestamps: true,
  },
);

const wowtoken_db = mongoose.model('wowtoken', schema, 'wowtoken');

module.exports = wowtoken_db;
