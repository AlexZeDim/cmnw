const mongoose = require('mongoose');
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

mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    connected_realm_id: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['D', 'M'],
    },
    price: {
        open: Number,
        open_size: Number,
        low: Number,
        low_size: Number,
        change: Number,
        avg: Number,
        high: Number,
        high_size: Number,
        close: Number,
        close_size: Number,
    },
    quantity: {
        open: Number,
        low: Number,
        change: Number,
        high: Number,
        close: Number,
    },
    open_interest: {
        open: Number,
        low: Number,
        change: Number,
        high: Number,
        close: Number,
    },
    risk: {
        stdDev: Number,
        stdDev_size: Number,
        VaR: Number,
        VaR_size: Number,
    },
    sellers: {
        sellers: Array,
        open: Number,
        change: Number,
        close: Number,
        total: Number,
    },
    price_data: Array,
    timestamp_data: Array,
},{
    timestamps: true
});


let contracts_db = mongoose.model('contracts', schema);

module.exports = contracts_db;
