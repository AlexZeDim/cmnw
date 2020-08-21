const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    author: String,
    mentions: Array,
    type: {
      type: String,
      enum: ['profile', 'message'],
      default: 'message',
    },
    clearance: [
      {
        _id: false,
        access: {
          type: Number,
          enum: [0, 1, 2, 3],
          default: 0,
        },
        codeword: {
          type: String,
          default: 'WoW',
        },
      },
    ],
    context: String,
  },
  {
    timestamps: true,
  },
);

let message_db = mongoose.model('messages', schema, 'messages');

module.exports = message_db;
