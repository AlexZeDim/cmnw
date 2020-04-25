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
/*    name: {
        type: String
    },*/
    description: {
        type: String
    },
    media: {
        type: String
    },
    horde_crafted_item: {
        type: Object
    },
    alliance_crafted_item: {
        type: Object
    },
    crafted_item: {
        type: Object
    },
    reagents: {
        type: Array
    },
    rank: {
        type: Number
    },
    //TODO check profession for valuations
},{
    timestamps: true
});

let professions = mongoose.model('professions', schema);

module.exports = professions;
