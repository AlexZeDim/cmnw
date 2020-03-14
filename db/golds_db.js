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
    connected_realm_id: Number,
    faction: String,
    owner: String,
    quantity: {
        type: Number,
        required: true
    },
    status: String,
    price: {
        type: Number,
        required: true
    },
    lastModified: {
        type: Date
    }
},{
    timestamps: true
});

let golds_db = mongoose.model('golds', schema);

module.exports = golds_db;