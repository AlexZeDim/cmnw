/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

//const schedule = require('node-schedule');
const getCharacter = require('./get_character');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

(async function indexCharacters (
  queryKeys = `OSINT-indexCharacters`,
  bulkSize = 5,
) {
  try {
    console.time(`OSINT-indexCharacters`);
    const { token } = await keys_db.findOne({ tags: queryKeys });
    await characters_db.syncIndexes()
    await characters_db.collection.createIndex({ 'hash.a': 1, 'updatedAt': 1, 'statusCode': 1 }, { name: `OSINT-${indexCharacters.name}` })
    await characters_db
      .find()
      .sort({ 'hash.a': 1, 'updatedAt': 1, 'statusCode': 1 })
      .maxTimeMS(0)
      .batchSize(bulkSize)
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(async ({ _id, realm }, iterations) => {
          const name = _id.split('@')[0]
          await getCharacter({ name: name, realm: realm, updatedBy: `OSINT-${indexCharacters.name}`, token: token, guildRank: false, createOnlyUnique: false, iterations: iterations });
        }, { parallel: bulkSize }
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-${indexCharacters.name}`);
    process.exit(0)
  }
})();
