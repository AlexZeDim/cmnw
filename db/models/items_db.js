const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    /**
     * Blizzard API
     */
    _id: Number,
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
    quality: String,
    ilvl: Number,
    level: Number,
    icon: String,
    item_class: String,
    item_subclass: String,
    purchase_price: Number,
    sell_price: Number,
    is_equippable: Boolean,
    is_stackable: Boolean,
    inventory_type: String,
    purchase_quantity: Number,
    loot_type: String,
    /**
     * IndexAssetClass - csv import
     */
    contracts: {
      type: Boolean,
      require: true,
      default: false,
    },
    asset_class: [String],
    /** add thought importTaxonomy_CSV('itemsparse') */
    expansion: String,
    stackable: Number,
    /** add thought importTaxonomy_CSV('taxonomy') */
    profession_class: String,
    ticker: String,
    /**
     * IndexItems
     */
    tags: [String]
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
