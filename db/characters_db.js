const mongoose = require('mongoose');
const {toSlug, fromSlug} = require('./setters');
mongoose.Promise = global.Promise;

/*require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});*/

let schema = new mongoose.Schema({
    /**
     * _id and id field represents Blizzard GUID name@realm
     * https://wow.gamepedia.com/GUID
     */
    _id: {
        type: String,
    },
    id: {
        type: Number
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
    logs: [{
        old_value: mongoose.Mixed,
        new_value: mongoose.Mixed,
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
    isActive: {
        type: Boolean,
        default: false,
    },
    isWatched: {
        type: Boolean,
        default: false,
    }
},{
    timestamps: true
});

schema.index({ "name": 1 },{name: 'Name'});
schema.index({ "guild": 1 },{name: 'Guild'});
schema.index({ "id": 1 },{name: 'ID'});
schema.index({ "hash.a": 1 },{name: 'Hash A'});
schema.index({ "hash.b": 1 },{name: 'Hash B'});
schema.index({ "hash.c": 1 },{name: 'Hash C'});
schema.index({ "hash.ex": 1 },{name: 'Hash EX'});
schema.index({ "updatedAt": 1 },{name: 'OSINT-IndexCharacters'});
schema.index({ "realm.slug": 1, "id": 1 },{name: 'ByGUID'});

let characters_db = mongoose.model('characters', schema);

module.exports = characters_db;
