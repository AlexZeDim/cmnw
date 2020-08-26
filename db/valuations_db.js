const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

/*require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});*/

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
