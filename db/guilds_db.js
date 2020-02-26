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
        join: [{
            character_name: String,
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_checksum: String,
        }],
        promote: [{
            character_name: String,
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_checksum: String,
        }],
        demote: [{
            character_name: String,
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_checksum: String,
        }],
        leave: [{
            character_name: String,
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_checksum: String,
        }],
    },
    members_latest: [{
        character_name: String,
        character_id: Number,
        character_rank: Number,
        character_date: Date,
        character_checksum: String,
    }],
    members_prev: [{
        character_name: String,
        character_id: Number,
        character_rank: Number,
        character_date: Date,
        character_checksum: String,
    }],
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
