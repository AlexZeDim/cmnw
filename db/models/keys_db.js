const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    _id: String,
    secret: {
      type: String,
      required: true,
    },
    token: String,
    expired_in: Number,
    tags: [String],
  },
  {
    timestamps: true,
  },
);

const keys_db = mongoose.model('keys', schema, 'keys');

module.exports = keys_db;
