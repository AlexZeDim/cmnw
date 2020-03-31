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
    type: {
        type: String
    }
},{
    timestamps: true
});

let valuations_db = mongoose.model('valuations', schema);

module.exports = valuations_db;