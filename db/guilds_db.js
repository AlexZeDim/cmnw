const mongoose = require('mongoose');
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
        type: String
    },
    id: {
        type: Number
    },
    name: {
        type: String
    },
    //TODO name_slug
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
    crest: {
        emblem: Object,
        border: Object,
        background: Object
    },
    guild_log: {
        join: [{
            character_name: String,
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_checksum: String, //TODO checksum to hash_a
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
    }
},{
    timestamps: true
});

schema.index({ name: 1 },{name: 'Name'});

let guild_db = mongoose.model('guilds', schema);

module.exports = guild_db;
