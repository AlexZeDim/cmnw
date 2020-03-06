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
    id: {
        type: Number
    },
    item: {
        type: Object
    },
    connected_realm_id: {
        type: Number
    },
    quantity: {
        type: Number
    },
    bid: {
        type: Number
    },
    buyout: {
        type: Number
    },
    unit_price: {
        type: Number
    },
    timeLeft: {
        type: String
    },
    lastModified: {
        type: Date
    }
},{
    timestamps: true
});

let auctions_db = mongoose.model('auctions', schema);

module.exports = auctions_db;