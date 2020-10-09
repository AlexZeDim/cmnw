/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const characters_db = require('../../db/characters_db');
const keys_db = require('../../db/keys_db');

/**
 * getCharacter indexing
 */

const getCharacter = require('../getCharacter');

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
  bulkSize = 10,
) => {
  try {
    console.time(`OSINT-indexCharacters`);
    let { token } = await keys_db.findOne(queryKeys);
    await characters_db
      .find(queryFind)
      .sort({'updatedAt': 1})
      .lean()
      .cursor({ batchSize: bulkSize })
      .eachAsync(
        async ({ _id }) => {
          const [characterName, realmSlug] = _id.split('@');
          await getCharacter(realmSlug, characterName, {}, token, `OSINT-indexCharacters`, false, false);
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`OSINT-indexCharacters`);
  }
})();
