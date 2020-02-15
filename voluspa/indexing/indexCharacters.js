const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const getCharacter = require('../getCharacter');

async function indexCharacters (queryInput = '') {
    try {
        console.time(`VOLUSPA-${indexCharacters.name}`);
        let documentBulk = [];
        const cursor = characters_db.find(queryInput).lean().cursor({batchSize: 20});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length === 20) {
                console.time(`Bulk-${indexCharacters.name}`);
                cursor.pause();
                const { token } = await keys_db.findOne({ tags: `VOLUSPA-${indexCharacters.name}` });
                const promises = documentBulk.map(async (req) => {
                    try {
                        let upd_char = await getCharacter((req.realm).toLowerCase().replace(/\s/g,"-"), (req.name).toLowerCase(), token);
                        upd_char.source = `VOLUSPA-${indexCharacters.name}`;
                        let {_id} = upd_char;
                        console.info(`${_id}`);
                        return await characters_db.findByIdAndUpdate(
                            {
                                _id: _id
                            },
                            upd_char,
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
                cursor.resume();
                console.timeEnd(`Bulk-${indexCharacters.name}`);
            }
        });
        cursor.on('error', error => {
            //TODO we are not sure, recourse
            console.error(error);
            cursor.close();
        });
        cursor.on('close', () => {
            console.timeEnd(`VOLUSPA-${indexCharacters.name}`);
            cursor.close();
            indexCharacters();
        });
    } catch (err) {
        console.error(`${indexCharacters.name},${err}`);
    }
}

indexCharacters();