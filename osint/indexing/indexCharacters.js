const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const getCharacter = require('../getCharacter');
const {connection} = require('mongoose');

/***
 * TODO sort by lastUpdated,
 * @param queryFind
 * @param queryKeys
 * @param bulkSize
 * @returns {Promise<void>}
 */

async function indexCharacters (queryFind = '', queryKeys = {tags: `OSINT-${indexCharacters.name}`}, bulkSize = 10) {
    try {
        console.time(`OSINT-${indexCharacters.name}`);
        let character_Array = [];
        let {token} = await keys_db.findOne(queryKeys);
        const cursor = characters_db.find(queryFind).sort({updatedAt: -1}).lean().cursor({batchSize: bulkSize});
        cursor.on('data', async ({_id}) => {
            character_Array.push(
                getCharacter((_id).split('@')[1], (_id).split('@')[0], token).then(u_character => {
                u_character.updatedBy = `OSINT-${indexCharacters.name}`;
                characters_db.findByIdAndUpdate(
                    {
                        _id: u_character._id
                    },
                    u_character,
                    {
                        upsert : true,
                        new: true,
                        setDefaultsOnInsert: true,
                        lean: true
                    }
                ).then(({_id, statusCode}) => {
                    if (~[400, 404, 403, 500].indexOf(statusCode)) {
                        console.error(`E:U,${_id}:${statusCode}`);
                    } else {
                        console.info(`F:U,${_id}:${statusCode}`);
                    }
                })
            }).catch(e=>(e)));
            if (character_Array.length >= bulkSize) {
                cursor.pause();
                console.time(`========================`);
                ({token} = await keys_db.findOne(queryKeys));
                await Promise.all(character_Array);
                character_Array = [];
                cursor.resume();
                console.timeEnd(`========================`);
            }
        });
        cursor.on('error', error => {
            console.error(`E,OSINT-${indexCharacters.name},${error}`);
            cursor.close();
            connection.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 60000));
            connection.close();
            console.timeEnd(`OSINT-${indexCharacters.name}`);
        });
    } catch (err) {
        console.error(`${indexCharacters.name},${err}`);
    }
}

indexCharacters();