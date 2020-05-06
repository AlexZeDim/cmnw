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
    _id: String, /** item_id@connected_realm_id */
    name: String, /** We should make it somehow */
    item_id: Number,
    asset_class: Array,
    connected_realm_id: Number,
    vendor: {
        sell_price: Number,
        buy_price: Number,
        yieldMarket: Number, /** if buy_price buy_price / market.price */
        yieldReagent: Number, /** if buy_price buy_price / market.price */
    },
    market: {
        lastModified: Date,
        price: Number,
        quantity: Number,
        open_interest: Number,
        orders: Array,
        price_size: Number,
        yieldReagent: Number, /** price / derivative.nominal_value */
        yieldVendor: Number, /** price / market.vendorSellPrice */
    },
    derivative: [{
        lastModified: Date,
        _id: String,
        quene_cost: Number, /** Cost of production quene*/
        quene_quantity: Number,
        nominal_value: Number, /** Cost/Q = for x1*/
        yieldMarket: Number, /** nominal_value / market.price */
        yieldVendor: Number, /** nominal_value / market.vendorSellPrice */
    }],
    reagent: {
        cheapest_to_delivery: {
            market: Number,
            vendor: Number,
            derivative: Number,
        },
        premium: Number, /** Родитель оценит остатком */
    },
},{
    timestamps: true
});

let valuations_db = mongoose.model('valuations', schema);

module.exports = valuations_db;
