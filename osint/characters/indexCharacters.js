/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const getCharacter = require('./getCharacter');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

(async function indexCharacters (
  bulkSize = 30,
) {
  try {
    console.time(`OSINT-indexCharacters`);
    const keys = await keys_db.find({ tags: /Characters/ }).limit(2);
    await characters_db
      .find()
      .sort({ 'hash_a': 1 })
      .lean()
      .cursor({ batchSize: bulkSize })
      .eachAsync(async ({ _id }, iterations) => {
        const [name, realm] = _id.split('@')
        await getCharacter({
          name: name,
          realm: { slug: realm },
          updatedBy: 'OSINT-indexCharacters',
          token: keys[iterations % 2].token,
          guildRank: false,
          createOnlyUnique: false,
          iterations: iterations,
          forceUpdate: true
        });
      }, { parallel: bulkSize })
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
    process.exit(0)
  }
})();
