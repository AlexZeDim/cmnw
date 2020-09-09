const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    name: String,
    item_id: Number,
    connected_realm_id: Number,
    type: {
      type: String,
      enum: [
        'VENDOR',
        'DERIVATIVE',
        'REAGENT',
        'MARKET',
        'PREMIUM',
        'FUNPAY',
        'OTC',
        'WOWTOKEN',
      ],
    },
    last_modified: Number,
    value: Number,
    flag: {
      type: String,
      enum: ['BUY', 'SELL', 'PAY FIX', 'PAY FLOAT'],
    },
    details: Object,
  },
  {
    timestamps: true,
  },
);

schema.index({ createdAt: -1 }, { name: 'TTL', expireAfterSeconds: 86400 });
schema.index(
  { item_id: -1, last_modified: -1, connected_realm_id: 1 },
  { name: 'IVA' },
);
schema.index({ type: -1 }, { name: 'LastModified' });
schema.index({ flag: -1 }, { name: 'Flag' });
schema.index({ value: -1 }, { name: 'Sorting' });

let valuations_db = mongoose.model('valuations', schema, 'valuations');

module.exports = valuations_db;
