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
        type: Number
    },
    region: {
        type: String
    },
    name: {
        type: String
    },
    name_locale: {
        type: String
    },
    slug: {
        type: String
    },
    category: {
        type: String
    },
    locale: {
        type: String
    },
    timezone: {
        type: String
    },
    type: {
        type: String
    },
    is_tournament: {
        type: Boolean
    },
    has_queue: {
        type: Boolean
    },
    status: {
        type: String
    },
    population: {
        type: String
    },
    connected_realm_id: {
        type: Number
    },
    connected_realm: {
        type: Array
    },
    ticker: {
        type: String
    },
    wcl_id: {
        type: Number
    }
},{
    timestamps: true
});

let realms_db = mongoose.model('realms', schema);

module.exports = realms_db;