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
    /**
     * Blizzard GUID name-realm-id
     * https://wow.gamepedia.com/GUID
     */
    _id: {
        type: String,
        set: toSlug
    },
    id: {
        type: Number
    },
    name: {
        type: String,
        set: toSlug,
        get: fromSlug,
    },
    realm: {
        type: String,
        set: toSlug,
        get: fromSlug
    },
    guild: {
        type: String,
        set: toSlug,
        get: fromSlug
    },
    guild_rank: {
        type: Number
    },
    logs: [{
        old_value: String,
        new_value: String,
        action: String,
        message: String,
        after: Date,
        before: Date
    }],
    ilvl: {
        eq: Number,
        avg: Number,
    },
    /***
     * A - full pets with names unique,
     * B - mount collection,
     * C - pet slots,
     * EX - id + class
     */
    hash: {
        a: String,
        b: String,
        c: String,
        ex: String,
    },
    race: {
        type: String
    },
    character_class: {
        type: String
    },
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
schema.index({ updatedAt: 1 },{name: 'IndexCharacters'});
//TODO text index on checksum, name

let characters_db = mongoose.model('characters', schema);

module.exports = characters_db;
