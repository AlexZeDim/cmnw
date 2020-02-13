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
    faction: {
        type: String
    },
    achievement_points: {
        type: Number
    },
    member_count: {
        type: Number
    },
    created_timestamp: {
        type: Number
    }
    //TODO is watched
},{
    timestamps: true
});

let guild_db = mongoose.model('guilds', schema);

module.exports = guild_db;
