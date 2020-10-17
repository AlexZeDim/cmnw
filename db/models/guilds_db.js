const mongoose = require('mongoose');
const { toSlug } = require('../setters');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    _id: {
      type: String,
    },
    id: {
      type: Number,
    },
    name: {
      type: String,
    },
    realm: {
      id: Number,
      name: String,
      slug: {
        type: String,
        set: toSlug,
      },
    },
    faction: {
      type: String,
    },
    crest: {
      emblem: Object,
      border: Object,
      background: Object,
    },
    members: [
      {
        _id: {
          type: String,
          set: toSlug,
        },
        id: Number,
        rank: Number,
      },
    ],
    achievement_points: {
      type: Number,
    },
    member_count: {
      type: Number,
    },
    lastModified: {
      type: Date,
    },
    created_timestamp: {
      type: Date,
    },
    statusCode: {
      type: Number,
    },
    isWatched: {
      type: Boolean,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ name: 1 }, { name: 'Name' });
schema.index({ 'realm.slug': 1 }, { name: 'RealmSlug' });
schema.index({ id: 1, 'realm.slug': 1 }, { name: 'RenameGuild' });

let guild_db = mongoose.model('guilds', schema, 'guilds');

//mongoose.connection.close()

module.exports = guild_db;
