const mongoose = require('mongoose');
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

mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: {
        type: String
    },
    id: {
        type: Number
    },
    name: {
        type: String
    },
    guild: {
        type: String
    },
    guild_rank: {
        type: Number
    },
    guild_history: {
        type: Array
    },
    realm: {
        type: String
    },
    realm_slug: {
        type: String
    },
    ilvl: {
        eq: Number,
        avg: Number,
    },
    checksum: {
        pets: String,
        mounts: String,
        petSlots: Array
    },
    race: {
        type: String
    },
    class: {
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
schema.index({ name: 1 },{name: 'Guild'});

let characters_db = mongoose.model('characters', schema);

module.exports = characters_db;
