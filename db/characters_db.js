const mongoose = require('mongoose');
const {toSlug, fromSlug} = require('./setters');
mongoose.Promise = global.Promise;

require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

let schema = new mongoose.Schema({
    _id: {
        type: String,
        set: toSlug
    },
    id: {
        type: Number
    },
    name: {
        type: String,
        set: fromSlug
    },
    guild: {
        type: String,
        set: fromSlug
    },
    guild_rank: {
        type: Number
    },
    guild_history: [{
        guild_rank: Number,
        guild_id: Number,
        guild_name: String,
        guild_realm: String,
        action: String,
        after: Date,
        before: Date,
    }],
    realm: {
        type: String,
        set: fromSlug
    },
    realm_slug: {
        type: String,
        set: toSlug
    },
    ilvl: {
        eq: Number,
        avg: Number,
    },
    hash: {
        a: String,
        b: String,
        ex: String,
        petSlots: Array
    },
    race: {
        type: String
    },
    character_class: {
        type: String
    },
    character_history: [{
        old_value: String,
        new_value: String,
        action: String,
        after: Date,
        before: Date
    }],
    spec: {
        type: String
    },
    gender: {
        type: String
    },
    faction: {
        type: String
    },
    level: {
        type: Number
    },
    lastModified: {
        type: Date
    },
    lastOnline: {
        type: Date
    },
    statusCode: {
        type: Number
    },
    media: {
        avatar_url: String,
        bust_url: String,
        render_url: String
    },
    createdBy: {
        type: String
    },
    updatedBy: {
      type: String
    },
    isWatched: {
        type: Boolean
    }
},{
    timestamps: true
});

schema.index({ name: 1 },{name: 'Name'});
schema.index({ guild: 1 },{name: 'Guild'});
schema.index({ id: 1 },{name: 'ID'});
schema.index({ "hash.a": 1 },{name: 'Hash A'});
schema.index({ "hash.b": 1 },{name: 'Hash B'});
schema.index({ updatedAt: -1 },{name: 'IndexCharacters'});
//TODO text index on checksum, name

let characters_db = mongoose.model('characters', schema);

module.exports = characters_db;
