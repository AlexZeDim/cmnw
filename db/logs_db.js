const mongoose = require('mongoose');
require('dotenv').config();
//TODO TTL by created
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
    isIndexed: {
        type: Boolean
    },
    realm: {
        type: String
    },
    source: {
        type: String
    },
},{
    timestamps: true
});

let logs_db = mongoose.model('logs', schema);

module.exports = logs_db;