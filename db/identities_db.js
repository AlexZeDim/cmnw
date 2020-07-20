const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: {
        type: String,
    },
    clearance: {
        access: {
            type: String,
            enum: ['white', 'green', 'amber', 'red'],
            default: 'white'
        },
        codewords: Array,
    },
    type: {
        type: String,
        enum: ['persona', 'guild'],
    },
    aliases: [{
        type: {
            type: String,
            enum: ['discord', 'battle.tag', 'twitter', 'name', 'character'],
        },
        value: String,
    }]
},{
    timestamps: true
});

let identity_db = mongoose.model('identities', schema, 'identities');

module.exports = identity_db;
