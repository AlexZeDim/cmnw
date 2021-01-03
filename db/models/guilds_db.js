const mongoose = require('mongoose');
const { toSlug } = require('../setters');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    _id: {
      type: String,
      lowercase: true
    },
    id: Number,
    name: String,
    realm: {
      _id: Number,
      name: String,
      slug: {
        type: String,
        set: toSlug,
      },
    },
    faction: String,
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
          lowercase: true
        },
        id: Number,
        rank: Number,
      },
    ],
    achievement_points: Number,
    member_count: Number,
    lastModified: Date,
    created_timestamp: Date,
    statusCode: Number,
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  },
);

schema.index({ 'realm.slug': 1, id: 1 }, { name: 'RenameGuild' });

const guild_db = mongoose.model('guilds', schema, 'guilds');

module.exports = guild_db;
