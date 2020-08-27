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

let schema = new mongoose.Schema(
  {
    /**
     * Blizzard API
     */
    _id: {
      type: Number,
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
      type: String,
    },
    ilvl: {
      type: Number,
    },
    level: {
      type: Number,
    },
    icon: {
      type: String,
    },
    item_class: {
      type: String,
    },
    item_subclass: {
      type: String,
    },
    purchase_price: {
      type: Number,
    },
    sell_price: {
      type: Number,
    },
    is_equippable: {
      type: Boolean,
    },
    is_stackable: {
      type: Boolean,
    },
    inventory_type: {
      type: String,
    },
    purchase_quantity: {
      type: Number,
    },
    loot_type: {
      type: String,
    },
    /**
     * IndexAssetClass - csv import
     */
    contracts: {
      type: Boolean,
      require: true,
      default: false,
    },
    asset_class: {
      type: Array,
    },
    /** add thought importTaxonomy_CSV('itemsparse') */
    expansion: {
      type: String,
    },
    stackable: {
      type: Number,
    },
    /** add thought importTaxonomy_CSV('taxonomy') */
    profession_class: {
      type: String,
    },
    ticker: {
      type: String,
    },
    /**
     * IndexItems
     */
    tags: Array
  },
  {
    timestamps: true,
  },
);

schema.index(
  {
    'ticker': 'text',
    'name.en_GB': 'text',
    'name.ru_RU': 'text',
    'tags': 'text'
  },
  {
    weights: {
      'ticker': 2,
      'name.en_GB': 2,
      'name.ru_RU': 2,
      'tags': 1
    },
    name: 'SearchQuery',
  },
);

schema.index({ 'expansion': 1, 'is_commdty': 1 }, { name: 'Contracts' });

let items_db = mongoose.model('items', schema, 'items');

module.exports = items_db;
