const characters_db = require("../../db/characters_db");
const getCharacter = require('../getCharacter');

let myCursor = characters_db.find({}).lean().cursor({batchSize:50});

myCursor.eachAsync( async (player) => {
    try {
        let character = await getCharacter(player.realm, player.name.toLowerCase(), void 0);
        let { _id } = character;
        if (character.hasOwnProperty('guild')) {
            //TODO we are not sure
            character.guild_history = { _id: character.guild }
        }
        character.source = 'VOLUSPA-index';
        await characters_db.findByIdAndUpdate(
            {
                _id: _id
            },
            character,
            {
                upsert : true,
                new: true,
                setDefaultsOnInsert: true,
                lean: true
            }
        ).exec();
        console.log(character)
    } catch (e) {
        console.log(e)
    }
});