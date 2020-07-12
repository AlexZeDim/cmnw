const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: {
        type: String,
    },
    message: {
        type: {
            type: String,
            enum: ['profile', 'message'],
            default: 'message'
        },
        clearance: String,
        context: String,
    }
},{
    timestamps: true
});

let message_db = mongoose.model('messages', schema, 'messages');

module.exports = message_db;
