/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const getCharacter = require('./get_character');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

(async (
  queryFind = {},
  queryKeys = { tags: `OSINT-indexCharacters` },
  bulkSize = 5,
) => {
  try {
    console.time(`OSINT-indexCharacters`);
    let { token } = await keys_db.findOne(queryKeys);
    let c = 0;
    const array = [];
    let info_string = '';
    const characters = await characters_db
      .find(queryFind, { timeout: false })
      .maxTimeMS(0)
      .batchSize(bulkSize)
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout',true)
    characters.on('data', async ({ _id, realm }) => {
      const name = _id.split('@')[0]
      info_string += `${c} ${name}@${realm.slug}\n`;
      array.push(getCharacter({ name: name, realm: { slug: realm.slug }, updatedBy: `OSINT-indexCharacters` }, token, false, false, c))
      if (array.length >= 10) {
        await characters.pause()
        console.log(`===================`)
        console.info(info_string)
        console.log(`===================`)
        await Promise.allSettled(array)
        await characters.resume()
        array.length = 0
        info_string = ''
      }
      c++
    })
    characters.on('error', async (error) => {
      console.error(c, error)
      console.timeEnd(`OSINT-indexCharacters`);
    })
    characters.on('close', async () => {
      console.timeEnd(`OSINT-indexCharacters`);
      process.exit(0)
    })
  } catch (error) {
    console.error(error);
  }
})();
