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
        type: Number
    },
    spell_id: {
        type: Number
    },
    item_id: {
        type: Number
    },
    item_quantity: {
        type: Number
    },
    reagents: {
        type: Array
    },
    quantity: {
        type: Array
    },
    rank: {
        type: Number
    },
    profession: {
        type: String
    }
    //TODO check profession for valuations
},{
    timestamps: true
});

let pricing_db = mongoose.model('pricing_methods', schema);

module.exports = pricing_db;
