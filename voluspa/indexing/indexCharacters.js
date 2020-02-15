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
                    return getCharacter((req.realm).toLowerCase().replace(/\s/g,"-"), (req.name).toLowerCase());
                }));
                /*
                let tested = await Promise.all([
                    getCharacter((bulkCharacters[0].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[0].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[1].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[1].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[2].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[2].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[3].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[3].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[4].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[4].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[5].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[5].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[6].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[6].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[7].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[7].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[8].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[8].name).toLowerCase(), void 0),
                    getCharacter((bulkCharacters[9].realm).toLowerCase().replace(/\s/g,"-"), (bulkCharacters[9].name).toLowerCase(), void 0),
                ]);
                 */
                console.log(test);
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