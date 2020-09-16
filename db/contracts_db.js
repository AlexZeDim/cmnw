const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { Round2 } = require('./setters');

let schema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    item_id: {
      type: Number,
      required: true,
    },
    connected_realm_id: {
      type: Number,
      required: true,
    },
    last_modified: {
      type: Number,
      required: true,
    },
    date: {
      day: Number,
      week: Number,
      month: Number,
      year: Number,
    },
    price: {
      type: Number,
      get: Round2,
      set: Round2,
    },
    price_size: {
      type: Number,
      get: Round2,
      set: Round2,
    },
    quantity: Number,
    open_interest: {
      type: Number,
      get: Round2,
      set: Round2,
    },
    orders: Array,
    sellers: Array,
  },
  {
    timestamps: true,
  },
);

schema.ndex(
  { 'date.month': -1, connected_realm_id: 1, item_id: -1 },
  { name: 'M' },
);
schema.index(
  { 'date.week': -1, connected_realm_id: 1, item_id: -1 },
  { name: 'W' },
);

let contracts_db = mongoose.model('contracts', schema, 'contracts');

module.exports = contracts_db;
