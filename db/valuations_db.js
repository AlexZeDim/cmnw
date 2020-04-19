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
    item_id: Number,
    connected_realm_id: Number,
    market: {
        lastModified: Date,
        price: Number,
        price_size: Number,
    },
    model: {
        valuations: [
            {
                name: String,
                pricing_method_id: Number,
                pricing_method: Array,
                quene_quantity: Number,
                quene_cost: Number,
                premium: Number,
                nominal_value: Number,
                underlying: Number,
                lastModified: Date
            }
        ],
        cheapest_to_delivery: {
            name: String,
            pricing_method_id: Number,
            pricing_method: Array,
            quene_quantity: Number,
            quene_cost: Number,
            premium: Number,
            nominal_value: Number,
            underlying: Number,
            lastModified: Date
        }
    }
},{
    timestamps: true
});

let pricing_db = mongoose.model('pricing', schema);

module.exports = pricing_db;
