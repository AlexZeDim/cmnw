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
    const characters = await characters_db
      .find(queryFind, { timeout: false })
      .maxTimeMS(0)
      .batchSize(bulkSize)
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout',true)
    for await (const { _id, realm } of characters) {
      const name = _id.split("@")[0]
      array.push(getCharacter({ name: name, realm: realm, updatedBy: `OSINT-indexCharacters` }, token, false, false, c))
      if (array.length >= 10) {
        await Promise.allSettled(array)
        array.length = 0
      }
      c++
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
    process.exit(0)
  }
})();
