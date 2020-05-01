const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

require('dotenv').config();
mongoose.connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});


let schema = new mongoose.Schema({
    /** API or LOCAL */
    _id: {
        type: Number
    },
    /** API */
    name: {
        type: Object
    },
    description: {
        type: Object
    },
    media: {
        type: String
    },
    horde_item_id: {
        type: Number
    },
    alliance_item_id: {
        type: Number
    },
    /** API or LOCAL */
    item_id: {
        type: Object
    },
    /** LOCAL, see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
     *  SkillLineAbility.lua
     * */
    item_quantity: {
        type: Number
    },
    spell_id: {
        type: Number
    },
    /** API or LOCAL
     *  {id: Number, Quantity: Number}
     * */
    reagents: {
        type: [
            {
                _id: Number,
                quantity: Number
            }
        ]
    },
    /** if Local then Convert from SkillLine*/
    profession: {
        type: String
    },
    /** API */
    expansion: {
        type: String
    },
    rank: {
        type: Number
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    reagent_items: {
        type: Array
    }
},{
    timestamps: true
});

schema.index({ item_id: -1 },{name: 'itemID'});
schema.index({ horde_item_id: -1 },{name: 'HitemID'});
schema.index({ alliance_item_id: -1 },{name: 'AitemID'});
schema.index({ spell_id: -1 },{name: 'spellID'});


let professions = mongoose.model('professions', schema);

module.exports = professions;
