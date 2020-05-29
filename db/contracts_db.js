const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

/*require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});*/

let schema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    item_id: {
        type: Number,
    },
    date: {
        day: Number,
        week: Number,
        month: Number,
        year: Number,
    },
    connected_realm_id: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['D', 'W', 'M'],
    },
    price: {
        open: Number,
        low: Number,
        change: Number,
        avg: Number,
        high: Number,
        close: Number,
    },
    price_size: {
        open: Number,
        low: Number,
        change: Number,
        avg: Number,
        high: Number,
        close: Number,
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
    orders: {
        open: Number,
        low: Number,
        change: Number,
        high: Number,
        close: Number,
        orders_total: Number,
        orders_added: Number,
        orders_cancelled: Number,
        orders_expired: Number,
        ratio_added: Number,
        ratio_cancelled: Number,
        ratio_expired: Number,
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
    data: Array,
},{
    timestamps: true
});


let contracts_db = mongoose.model('contracts', schema);

module.exports = contracts_db;
