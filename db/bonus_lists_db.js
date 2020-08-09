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
    _id: Number,
    level: Number,
    azerite_tier_unlock_id: Number,
    name: String,
    ilevel: String,
    tag: String,
    quality: Number,
    curveId: Number,
    rawStats: Array,
    stats: String,
    socket: Number,
    effect: Object,

},{
    timestamps: true
});

let bonus_lists_db = mongoose.model('bonus_lists', schema, 'bonus_lists');

module.exports = bonus_lists_db;

