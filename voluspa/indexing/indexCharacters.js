const characters_db = require("../../db/characters_db");
const guilds_db = require("../../db/guilds_db");
const getCharacter = require('../getCharacter');

async function indexCharacters () {
    try {
        const allPlayers = [];
        const cursor = guilds_db.find({}).lean().cursor({batchSize: 50});
        cursor.on('data', (characterData) => {
            allPlayers.push(characterData);
            console.log(allPlayers.length);
        });
        cursor.on('error', error => {
            console.error(error);
            cursor.close();
        });
        cursor.on('close', () => {
            console.log('closing...');
            cursor.close();
        });
    } catch (err) {
        console.error(`${indexCharacters.name},${err}`);
    }
}

indexCharacters();

//let myCursor = characters_db.find({}).lean().cursor({batchSize:50});

/*
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
});*/