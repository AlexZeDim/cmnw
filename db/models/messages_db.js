const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    author: String,
    mentions: [String],
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
    content: String,
    params: Object,
  },
  {
    timestamps: true,
  },
);

const message_db = mongoose.model('messages', schema, 'messages');

module.exports = message_db;
