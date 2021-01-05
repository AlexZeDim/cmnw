const mongoose = require('mongoose');

const { Round2 } = require('../setters');

const schema = new mongoose.Schema(
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


const contracts_db = mongoose.model('contracts', schema, 'contracts');

module.exports = contracts_db;
