const characters_db = require("../../db/characters_db");
const getCharacter = require('../getCharacter');

async function indexCharacters () {
    try {
        const bulkCharacters = [];
        const cursor = characters_db.find({}).lean().cursor({batchSize: 10});
        cursor.on('data', async (characterData) => {
            bulkCharacters.push(characterData);
            if (bulkCharacters.length === 10) {
                cursor.pause();
                let test = await Promise.all(bulkCharacters.map(async (req) => {
                    try {
                        let x = await getCharacter((req.realm).toLowerCase().replace(/\s/g,"-"), (req.name).toLowerCase());
                        console.log(x);
                    } catch (e) {
                        console.log(e)
                    }
                }));
                console.log(typeof test, test.length);
                console.log('stop')
            }
            console.log(bulkCharacters.length);
            //console.log(characterData)
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