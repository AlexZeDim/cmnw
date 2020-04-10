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

schema.index({ isIndexed: 1 },{name: 'isIndexed'});
schema.index({ createdAt: -1 },{name: 'TTL', expireAfterSeconds: 604800});

let logs_db = mongoose.model('logs', schema);

module.exports = logs_db;