const mongoose = require('mongoose');
const { toSlug } = require('../setters');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    _id: {
      type: Number,
    },
    region: {
      type: String,
    },
    name: {
      type: String,
    },
    slug: {
      type: String,
    },
    name_locale: {
      type: String,
    },
    slug_locale: {
      type: String,
      set: toSlug,
    },
    category: {
      type: String,
    },
    locale: {
      type: String,
    },
    timezone: {
      type: String,
    },
    type: {
      type: String,
    },
    is_tournament: {
      type: Boolean,
    },
    has_queue: {
      type: Boolean,
    },
    status: {
      type: String,
    },
    population: {
      type: String,
    },
    connected_realm_id: {
      type: Number,
    },
    connected_realm: {
      type: Array,
    },
    ticker: {
      type: String,
    },
    /**
     * Kihra's WarcraftLogs realm ids
     * for parsing logs via fromLogs
     */
    wcl_id: {
      type: Number,
    },
    /**
     * String lastModified timestamp for auctions, gold and valuations
     * Required for valuations, getAuctionData, getGold
     */
    auctions: {
      type: Number,
    },
    valuations: {
      type: Number,
    },
    golds: {
      type: Number,
    },
    /**
     * VOLUSPA population
     */
    players: {
      total: Number,
      alliance: Number,
      horde: Number,
      max_level: Number,
      unique: Number,
    },
    guilds: {
      total: Number,
      alliance: Number,
      horde: Number,
    }
  },
  {
    timestamps: true,
  },
);

schema.index({ name: 1 }, { name: 'Name', collation: { strength: 1 } });
schema.index({ slug: 1 }, { name: 'Slug', collation: { strength: 1 } });
schema.index(
  { name_locale: 1 },
  { name: 'NameLocale', collation: { strength: 1 } },
);
schema.index({ ticker: 1 }, { name: 'Ticker', collation: { strength: 1 } });
schema.index({ connected_realm_id: 1 }, { name: 'ConnectedRealms' });
schema.index(
  { name: 'text', slug: 'text', name_locale: 'text', ticker: 'text', region: 'text', locale: 'text' },
  { name: 'SearchQuery' },
);

let realms_db = mongoose.model('realms', schema, 'realms');

module.exports = realms_db;
