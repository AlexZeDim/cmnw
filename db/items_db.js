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
        type: Number
    },
    name: {
        en_US: String,
        es_MX: String,
        pt_BR: String,
        de_DE: String,
        en_GB: String,
        es_ES: String,
        fr_FR: String,
        it_IT: String,
        ru_RU: String,
    },
    quality: {
        type: String
    },
    ilvl: {
        type: Number
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
    purchase_price: {
        type: Number
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
    inventory_type: {
        type: String
    },
    /**
     * IndexAssetClass - csv import
     */
    profession_class: {
        type: String
    },
    asset_class: {
        type: Array,
    },
    expansion: {
        type: String,
    },
    ticker: {
        type: String,
    },
    /**
     * IndexItems
     */
    is_commdty: {
        type: Boolean
    },
    is_auctionable: {
        type: Boolean
    },
    is_derivative: {
        type: Boolean,
        default: false
    },
    is_reagent: {
        type: Boolean,
        default: false
    },
    is_const: {
        type: Boolean,
        default: false
    }
});

schema.index(
    {
        "ticker": "text",
        "name.en_GB": "text",
        "name.ru_RU": "text"
    },
    {
        weights: {
            "ticker": 1,
            "name.en_GB": 1,
            "name.ru_RU": 1
        },
        name: 'SearchQuery'
    }
);

schema.index({ expansion: 1, is_commdty: 1 },{name: 'Contracts'});

let items_db = mongoose.model('items', schema, 'items');

module.exports = items_db;