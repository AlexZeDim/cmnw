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
    _id: String, /** item_id@connected_realm_id */
    name: String, /** We should make it somehow */
    item_id: Number,
    asset_class: Array,
    connected_realm_id: Number,
    last_modified: Number,
    vendor: {
        sell_price: Number,
        buy_price: Number,
        yieldMarket: Number, /** if buy_price buy_price / market.price */
        yieldReagent: Number, /** if buy_price buy_price / market.price */
    },
    market: {
        last_modified: Number,
        price: Number,
        quantity: Number,
        open_interest: Number,
        orders: Array,
        price_size: Number,
        yieldReagent: Number, /** price / derivative.nominal_value */
        yieldVendor: Number, /** price / market.vendorSellPrice */
    },
    derivative: [{
        _id: String,
        rank: Number,
        reagent_items: Array, /**IDEA ...add? */
        queue_cost: Number, /** Cost of production quene*/
        queue_quantity: Number,
        nominal_value: Number, /** Cost/Q = for x1*/
        premium: Number,
        yieldMarket: Number, /** nominal_value / market.price */
        yieldVendor: Number, /** nominal_value / market.vendorSellPrice */
        last_modified: Number,
    }],
    reagent: {
        name: String,
        value: Number,
        index: Number, /** Index of derivative method*/
        p_value: Number,
        p_index: Number,
        premium: [{ /** Родитель оценит остатком */
            _id: String,
            value: Number,
            wi: Number, /** premiumItem_Q x quantity */
        }],
    },
},{
    timestamps: true
});

schema.index({ last_modified: -1 },{name: 'LastModified'});

let valuations_db = mongoose.model('valuations', schema, 'valuations');

module.exports = valuations_db;
