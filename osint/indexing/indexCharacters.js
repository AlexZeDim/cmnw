const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const getCharacter = require('../getCharacter');
const {connection} = require('mongoose');

/***
 * TODO Promise.all
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

async function indexCharacters (queryFind = {}, queryKeys = {tags: `OSINT-${indexCharacters.name}`}, bulkSize = 10) {
    try {
        console.time(`OSINT-${indexCharacters.name}`);
        let character_Array = [];
        let {token} = await keys_db.findOne(queryKeys);
        const cursor = characters_db.find(queryFind).sort({updatedAt: 1}).lean().cursor({batchSize: bulkSize});
        cursor.on('data', async ({_id}) => {
            const [characterName, realmSlug] = _id.split('-');
            character_Array.push(getCharacter(realmSlug, characterName, {}, token,`OSINT-${indexCharacters.name}`, false));
            if (character_Array.length >= bulkSize) {
                cursor.pause();
                console.time(`========================`);
                ({token} = await keys_db.findOne(queryKeys));
                await Promise.all(character_Array);
                character_Array.length = 0;
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