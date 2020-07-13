const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: Number,
    region: {
        type: String,
        enum: ['eu', 'us'],
    },
    price: Number,
    lastModified: Date
},{
    timestamps: true
});

let wowtoken_db = mongoose.model('wowtoken', schema, 'wowtoken');

module.exports = wowtoken_db;
