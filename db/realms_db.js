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

schema.index({ name: 1 },{name: 'Name', collation: { strength: 3 }});
schema.index({ slug: 1 },{name: 'Slug', collation: { strength: 3 }});
schema.index({ name_locale: 1 },{name: 'NameLocale', collation: { strength: 3 }});
schema.index({ ticker: 1 },{name: 'Ticker', collation: { strength: 3 }});
schema.index({ connected_realm_id: 1 },{name: 'ConnectedRealms'});
schema.index({ name: "text", slug: "text", name_locale: "text", ticker: "text" },{name: 'SearchQuery'});

let realms_db = mongoose.model('realms', schema);

module.exports = realms_db;