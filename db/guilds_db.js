const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
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
    slug: {
        type: String
    },
    realm: {
        type: String
    },
    realm_slug: {
        type: String
    },
    faction: {
        type: String
    },
    //TODO crest
    guild_log: {
        join: Array,
        promote: Array,
        demote: Array,
        leave: Array,
    },
    members_latest: {
        type: Array //
    },
    members_prev: {
        type: Array //TODO
    },
    achievement_points: {
        type: Number
    },
    member_count: {
        type: Number
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    created_timestamp: {
        type: Number
    },
    isWatched: {
        type: Boolean
    }
},{
    timestamps: true
});

let guild_db = mongoose.model('guilds', schema);

module.exports = guild_db;
