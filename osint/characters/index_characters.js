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
//const T = require('./T');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

(async (
  queryFind = { name: "Бэквордация" },
  queryKeys = { tags: `OSINT-indexCharacters` },
  bulkSize = 10,
) => {
  try {
    console.time(`OSINT-indexCharacters`);
    let { token } = await keys_db.findOne(queryKeys);
    const t_index = await characters_db
/*    await characters_db
      .find(queryFind, null, { timeout: false })
      .limit(50)
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(async ({ name, realm }, i) => {
          await getCharacter({ name: name, realm: realm, updatedBy: `OSINT-indexCharacters` }, token, false, false, i);
        }, { parallel: bulkSize }
      );*/
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
  }
})();
