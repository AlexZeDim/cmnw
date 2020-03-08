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
    _id: {
        type: Number
    },
    name: {
        pt_BR: String,
        de_DE: String,
        en_GB: String,
        es_ES: String,
        fr_FR: String,
        it_IT: String,
        ru_RU: String,
        ko_KR: String,
        zh_TW: String,
    },
    quality: {
        type: String
    },
    level: {
      type: Number
    },
    icon: {
        type: String
    },
    item_class: {
        type: String
    },
    item_subclass: {
        type: String
    },
    sell_price: {
        type: Number
    },
    is_equippable: {
        type: Boolean
    },
    is_stackable: {
        type: Boolean
    },
    indx: {
        type: Boolean
    },
    yld: {
        type: Boolean
    },
    asset_class: {
        type: String
    },
    class: {
        type: String
    },
    inventory_type: {
        type: String
    },
    type: {
        type: String
    },
    expansion: {
        type: String
    },
    ticker: {
        type: String
    },
});

let items_db = mongoose.model('items', schema);

module.exports = items_db;