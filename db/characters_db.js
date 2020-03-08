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
        type: String
    },
    id: {
        type: Number
    },
    name: {
        type: String
    },
    guild: {
        type: String
    },
    guild_rank: {
        type: Number
    },
    guild_history: {
        type: Array
    },
    realm: {
        type: String
    },
    realm_slug: {
        type: String
    },
    ilvl: {
        eq: Number,
        avg: Number,
    },
    checksum: {
        pets: String,
        mounts: String,
        petSlots: Array
    },
    race: {
        type: String
    },
    class: {
        type: String
    },
    spec: {
        type: String
    },
    gender: {
        type: String
    },
    faction: {
        type: String
    },
    level: {
        type: Number
    },
    lastModified: {
        type: Date
    },
    createdBy: {
        type: String
    },
    updatedBy: {
      type: String
    },
    isWatched: {
        type: Boolean
    }
    //TODO media
},{
    timestamps: true
});

//schema.index({ id: 1 });

let characters_db = mongoose.model('characters', schema);

//characters_db.on('index', function(error) {
    //console.log(error.message);
//});


module.exports = characters_db;
