const mongoose = require('mongoose');
const { toSlug, fromSlug } = require('./setters');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    /**
     * _id and id field represents Blizzard GUID name@realm
     * https://wow.gamepedia.com/GUID
     */
    _id: {
      type: String,
    },
    id: {
      type: Number,
      default: Date.now,
    },
    name: {
      type: String,
      set: fromSlug,
      get: fromSlug,
    },
    realm: {
      id: Number,
      name: String,
      slug: {
        type: String,
        set: toSlug,
      },
    },
    guild: {
      id: Number,
      name: String,
      slug: {
        type: String,
        set: toSlug,
      },
      rank: Number,
    },
    ilvl: {
      eq: Number,
      avg: Number,
    },
    /***
     * A - full pets with names unique,
     * B - mount collection,
     * C - pet slots,
     * EX - id + class
     * T - active title
     */
    hash: {
      a: String,
      b: String,
      c: String,
      ex: String,
      t: String,
    },
    race: {
      type: String,
    },
    character_class: {
      type: String,
    },
    spec: {
      type: String,
    },
    gender: {
      type: String,
    },
    faction: {
      type: String,
    },
    level: {
      type: Number,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    statusCode: {
      type: Number,
    },
    media: {
      avatar_url: String,
      bust_url: String,
      render_url: String,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
    isWatched: {
      type: Boolean,
      default: false,
    },
    lfg: {
      battle_tag: String,
      rio: Number,
      days_from: Number,
      days_to: Number,
      wcl_percentile: Number,
      progress: Object,
      role: String
    },
    personality: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ 'name': 1 }, { name: 'Name' });
schema.index({ 'guild.name': 1 }, { name: 'Guild' });
schema.index({ 'id': 1 }, { name: 'ID' });
schema.index({ 'isWatched': 1 }, { name: 'LFG' });

schema.index({ 'hash.a': 1 }, { name: 'Hash A' });
schema.index({ 'hash.b': 1 }, { name: 'Hash B' });
schema.index({ 'hash.c': 1 }, { name: 'Hash C' });
schema.index({ 'hash.ex': 1 }, { name: 'Hash EX' });
schema.index({ 'hash.t': 1 }, { name: 'Hash T' });

schema.index({ 'personality': 1 }, { name: 'VOLUSPA' });
schema.index({ 'updatedAt': 1 }, { name: 'OSINT-IndexCharacters' });
schema.index({ 'realm.slug': 1, 'id': 1 }, { name: 'ByGUID' });

let characters_db = mongoose.model('characters', schema, 'characters');

module.exports = characters_db;
