const mongoose = require('mongoose');
const { toSlug } = require('../setters');

const schema = new mongoose.Schema(
  {
    root_id: {
      type: String,
      set: toSlug,
      get: toSlug,
      lowercase: true,
      index: true
    },
    root_history: {
      type: Array,
    },
    type: {
      type: String,
      enum: ['character', 'guild'],
    },
    original_value: String,
    new_value: String,
    message: String,
    action: String,
    before: Date,
    after: Date,
  },
  {
    timestamps: true,
  },
);

const osint_logs_db = mongoose.model('osint_logs', schema, 'osint_logs');

module.exports = osint_logs_db;
