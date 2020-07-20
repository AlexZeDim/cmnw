const mongoose = require('mongoose');
const { toSlug } = require('./setters');
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
    _id: {
        type: String,
    },
    id: {
        type: Number
    },
    /** CAPS LOCK NAMES */
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
        type: String
    },
    crest: {
        emblem: Object,
        border: Object,
        background: Object
    },
    logs: [{
        old_value: mongoose.Mixed,
        new_value: mongoose.Mixed,
        action: String,
        message: String,
        after: Date,
        before: Date
    }],
    guild_log: {
        join: [{
            _id: String,
            id: Number,
            rank: Number,
        }],
        promote: [{
            _id: String,
            id: Number,
            rank: Number,
        }],
        demote: [{
            _id: String,
            id: Number,
            rank: Number,
        }],
        leave: [{
            _id: String,
            id: Number,
            rank: Number,
        }],
    },
    members: [{
        _id: {
            type: String,
            set: toSlug,
        },
        id: Number,
        rank: Number,
    }],
    achievement_points: {
        type: Number
    },
    member_count: {
        type: Number
    },
    lastModified: {
        type: Date
    },
    created_timestamp: {
        type: Date
    },
    statusCode: {
        type: Number
    },
    isWatched: {
        type: Boolean
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
},{
    timestamps: true
});

schema.index({ "name": 1 },{name: 'Name'});
schema.index({ "realm.slug": 1 } ,{name: 'RealmSlug'});

let guild_db = mongoose.model('guilds', schema, 'guilds');

module.exports = guild_db;
