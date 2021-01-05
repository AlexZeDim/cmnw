const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    _id: {
      type: String,
    },
    isIndexed: {
      type: Boolean,
    },
    realm: {
      type: String,
    },
    source: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ isIndexed: 1 }, { name: 'isIndexed' });
schema.index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 604800 });

const logs_db = mongoose.model('logs', schema, 'logs');

module.exports = logs_db;
