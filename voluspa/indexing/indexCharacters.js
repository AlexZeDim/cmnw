const characters_db = require("../../db/characters_db");
const getCharacter = require('../getCharacter');

let myCursor = characters_db.find({}).cursor({batchSize:50});

myCursor.eachAsync( async (player) => {
    try {
        let character = await getCharacter(player.realm, player.name.toLowerCase());
        if (character.hasOwnProperty('guild')) {
            character.guild_history = { _id: character.guild, rank: character.guild_rank }
        }
        character.source = 'VOLUSPA-index';
        //console.log(character)
    } catch (e) {
        console.log('error')
    }
});