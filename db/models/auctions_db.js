const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    id: {
      type: Number,
    },
    item: {
      type: Object,
    },
    connected_realm_id: {
      type: Number,
    },
    quantity: {
      type: Number,
    },
    bid: {
      type: Number,
    },
    buyout: {
      type: Number,
    },
    unit_price: {
      type: Number,
    },
    time_left: {
      type: String,
    },
    last_modified: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 86400 });
schema.index(
  { connected_realm_id: 1, last_modified: -1 },
  { name: 'TimestampCheck' },
);
schema.index({ 'item.id': -1, connected_realm_id: 1 }, { name: 'Quotes' });
schema.index({ last_modified: -1, 'item.id': -1, connected_realm_id: 1 }, { name: 'PriceLevel' });

const auctions_db = mongoose.model('auctions', schema, 'auctions');

module.exports = auctions_db;
