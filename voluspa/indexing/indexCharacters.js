const characters_db = require("../../db/characters_db");
const getCharacter = require('../getCharacter');

async function indexCharacters () {
    try {
        let documentBulk = [];
        const cursor = characters_db.find({}).lean().cursor({batchSize: 10});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length === 10) {
                cursor.pause();
                const promises = documentBulk.map(async (req) => {
                    try {
                        let char = await getCharacter((req.realm).toLowerCase().replace(/\s/g,"-"), (req.name).toLowerCase());
                        char.source = `VOLUSPA-${indexCharacters.name}`;
                        let {_id} = char;
                        return await characters_db.findByIdAndUpdate(
                            {
                                _id: _id
                            },
                            char,
                            {
                                upsert : true,
                                new: true,
                                setDefaultsOnInsert: true,
                                lean: true
                            }
                        ).exec();
                    } catch (e) {
                        console.log(e)
                    }
                });
                await Promise.all(promises);
                documentBulk = [];
                console.log('stop')
                cursor.resume();
            }
            console.log(documentBulk.length); //1-2-3+
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