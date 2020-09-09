const mongoose = require('mongoose');
const { toSlug } = require('./setters');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    root_id: {
      type: String,
      set: toSlug,
      get: toSlug,
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

schema.index({ root_id: 1 }, { name: 'RootID' });
schema.index({ type: 1, root_id: 1 }, { name: 'Search' });

let osint_logs_db = mongoose.model('osint_logs', schema, 'osint_logs');

//mongoose.connection.close()

module.exports = osint_logs_db;
