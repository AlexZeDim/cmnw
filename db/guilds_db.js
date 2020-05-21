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
        type: String
    },
    id: {
        type: Number
    },
    name: {
        type: String,
        set: fromSlug
    },
    name_slug: {
        type: String,
        set: toSlug
    },
    realm: {
        type: String,
        set: fromSlug
    },
    realm_slug: {
        type: String,
        set: toSlug
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
            character_name: {
                type: String,
                set: fromSlug
            },
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_hash_a: String,
            character_hash_b: String,
            character_hash_ex: String,
        }],
        promote: [{
            character_name: {
                type: String,
                set: fromSlug
            },
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_hash_a: String,
            character_hash_b: String,
            character_hash_ex: String,
        }],
        demote: [{
            character_name: {
                type: String,
                set: fromSlug
            },
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_hash_a: String,
            character_hash_b: String,
            character_hash_ex: String,
        }],
        leave: [{
            character_name: {
                type: String,
                set: fromSlug
            },
            character_id: Number,
            character_rank: Number,
            character_date: Date,
            character_hash_a: String,
            character_hash_b: String,
            character_hash_ex: String,
        }],
    },
    members: [{
        character_name: {
            type: String,
            set: fromSlug
        },
        character_id: Number,
        character_rank: Number,
        character_date: Date,
        character_hash_a: String,
        character_hash_b: String,
        character_hash_ex: String,
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
