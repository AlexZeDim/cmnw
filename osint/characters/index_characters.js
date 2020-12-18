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
  bulkSize = 10,
) {
  try {
    console.time(`OSINT-indexCharacters`);
    const { token } = await keys_db.findOne({ tags: queryKeys });
    let i = 0;
    await characters_db
      .aggregate([
        {
          $match: {
            'hash': { $exists: true },
            'hash.a': { $ne: null }
          }
        },
        {
          $group: {
            _id: { hash_a: '$hash.a' },
            characters: {
              $addToSet: {
                _id: '$_id'
              }
            },
          }
        },
      ])
      .cursor({ batchSize: bulkSize })
      .option({
        allowDiskUse: true,
        noCursorTimeout: true,
        maxTimeMS: 0
      })
      .exec()
      .eachAsync(block => {
        if (block.characters.length) {
          block.characters.forEach(character => {
            const [name, realm] = character._id.split('@')
            getCharacter({
              name: name,
              realm: { slug: realm },
              updatedBy: `OSINT-indexCharacters`,
              token: token,
              guildRank: false,
              createOnlyUnique: false,
              iterations: i++,
              forceUpdate: true
            });
          })
        }
      }, { parallel: bulkSize })
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
    //process.exit(0)
  }
})();
