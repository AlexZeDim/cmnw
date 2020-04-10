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
    secret: {
        type: String,
        required: true
    },
    token: {
        type: String,
    },
    expired_in: {
        type: Number,
    },
    tags: {
        type: Array,
    },
},{
    timestamps: true
});

let keys_db = mongoose.model('keys', schema);

module.exports = keys_db;