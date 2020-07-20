const mongoose = require('mongoose');
const { toSlug } = require('./setters');
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
    root_id: {
        type: String,
        set: toSlug,
        get: toSlug
    },
    type: {
        type: String,
        enum: ["character", "guild"]
    },
    original_value: String,
    new_value: String,
    message: String,
    action: String,
    before: Date,
    after: Date
},{
    timestamps: true
});

schema.index({ "root_id": 1 },{name: 'RootID'});
schema.index({ "type": 1, "character_id": 1 },{name: 'Search'});

let osint_logs_db = mongoose.model('osint_logs', schema, 'osint_logs');

//mongoose.connection.close()

module.exports = osint_logs_db;
