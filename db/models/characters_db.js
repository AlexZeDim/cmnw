const mongoose = require('mongoose');
const { toSlug, fromSlug } = require('../setters');
mongoose.Promise = global.Promise;

const schema = new mongoose.Schema(
  {
    /**
     * _id and id field represents Blizzard GUID name@realm-id
     * https://wow.gamepedia.com/GUID
     */
    _id: {
      type: String,
      lowercase: true
    },
    id: {
      type: Number,
      default: Date.now,
    },
    name: {
      type: String,
      index: true,
      set: fromSlug,
      get: fromSlug,
    },
    realm: {
      _id: Number,
      name: String,
      slug: {
        type: String,
        set: toSlug,
      },
    },
    guild: {
      _id: {
        type: String,
        lowercase: true,
        index: true,
      },
      id: Number,
      name: String,
      rank: Number,
    },
    ilvl: { //FIXME deprecated
      eq: Number,
      avg: Number,
    },
    /***
     * A - full pets with names unique,
     * B - pet slots,
     * F - file in persona_db
     * T - active title
     */
    hash: { //TODO deprecated
      a: String,
      b: String,
      f: String,
      t: String,
    },
    hash_a: {
      type: String,
      index: true
    },
    hash_b: {
      type: String,
      index: true
    },
    hash_f: {
      type: String,
      index: true
    },
    hash_t: {
      type: String,
      index: true
    },
    race: String,
    character_class: String,
    active_spec: String,
    gender: String,
    faction: String,
    level: Number,
    achievement_points: Number,
    statusCode: Number,
    average_item_level: Number,
    equipped_item_level: Number,
    chosen_covenant: String,
    renown_level: Number,
    media: {
      avatar_url: String,
      bust_url: String,
      render_url: String,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    createdBy: String,
    updatedBy: String,
    personality: {
      type: String,
      index: true
    },
    mounts: [
      {
        _id: Number,
        name: String,
      }
    ],
    pets: [
      {
        _id: Number,
        name: String,
      }
    ],
    professions: [
      {
        _id: false,
        name: String,
        tier: String,
        id: Number,
        skill_points: Number,
        max_skill_points: Number,
        specialization: String
      }
    ],
    lfg: {
      battle_tag: String,
      rio: Number,
      days_from: Number,
      days_to: Number,
      wcl_percentile: Number,
      progress: Object,
      role: String,
      transfer: Boolean
    }
  },
  {
    timestamps: true,
  },
);

schema.index({ 'realm.slug': 1, 'id': 1 }, { name: 'ByGUID' });

const characters_db = mongoose.model('characters', schema, 'characters');

module.exports = characters_db;
