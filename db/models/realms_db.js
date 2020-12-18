require('../connection')
const mongoose = require('mongoose');
const { toSlug } = require('../setters');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    _id: Number,
    region: String,
    name: String,
    slug: String,
    name_locale: String,
    slug_locale: {
      type: String,
      set: toSlug,
    },
    category: String,
    locale: String,
    timezone: String,
    type: String,
    is_tournament: Boolean,
    has_queue: Boolean,
    status: String,
    population: String,
    connected_realm_id: Number,
    connected_realm: [String],
    ticker: String,
    /**
     * Kihra's WarcraftLogs realm ids
     * for parsing logs via fromLogs
     */
    wcl_id: Number,
    /**
     * String lastModified timestamp for auctions, gold and valuations
     * Required for valuations, getAuctionData, getGold
     */
    auctions: Number,
    valuations: Number,
    golds: Number,
    populations: [
      {
        _id: false,
        characters_total: Number,
        characters_active: Number,
        characters_active_alliance: Number,
        characters_active_horde: Number,
        characters_active_max_level: Number,
        characters_guild_members: Number,
        characters_guildless: Number,
        players_unique: Number,
        players_active_unique: Number,
        characters_classes: [{
          _id: false,
          name: String,
          value: Number
        }],
        characters_professions: [{
          _id: false,
          name: String,
          value: Number
        }],
        characters_covenants: [{
          _id: false,
          name: String,
          value: Number,
          group: [{
            level: Number,
            value: Number,
          }]
        }],
        guilds_total: Number,
        guilds_alliance: Number,
        guilds_horde: Number,
        timestamp: Number
      }
    ]
  },
  {
    timestamps: true,
  },
);

schema.index({ connected_realm_id: 1 }, { name: 'ConnectedRealms' });
schema.index(
  {
    slug: 'text',
    name: 'text',
    name_locale: 'text',
    ticker: 'text',
    region: 'text',
    locale: 'text'
  },
  {
    weights: {
      'slug': 10,
      'name': 1,
      'name_locale': 1,
      'ticker': 3,
      'region': 1,
      'locale': 1
    },
    name: 'SearchQuery'
  },
);

const realms_db = mongoose.model('realms', schema, 'realms');

module.exports = realms_db;
