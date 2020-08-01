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
    item_id: {
        type: Number,
        required: true,
    },
    connected_realm_id: {
        type: Number,
        required: true,
    },
    last_modified: {
        type: Number,
        required: true,
    },
    date: {
        day: Number,
        week: Number,
        month: Number,
        year: Number,
    },
    price: Number,
    price_size: Number,
    quantity: Number,
    open_interest: Number,
    orders: Array,
    sellers: Array
},{
    timestamps: true
});

schema.index({ "date.month": -1, connected_realm_id: 1, item_id: -1 },{name: 'M'});
schema.index({ "date.week": -1, connected_realm_id: 1, item_id: -1 },{name: 'W'});
schema.index({ "date.month": -1, connected_realm_id: 1, item_id: -1 },{name: 'M'});

let contracts_db = mongoose.model('contracts', schema, 'contracts');

module.exports = contracts_db;
