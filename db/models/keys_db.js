const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    _id: {
      type: String,
    },
    secret: {
      type: String,
      required: true,
    },
    token: {
      type: String,
    },
    expired_in: {
      type: Number,
    },
    tags: {
      type: Array,
    },
  },
  {
    timestamps: true,
  },
);

let keys_db = mongoose.model('keys', schema, 'keys');

module.exports = keys_db;
