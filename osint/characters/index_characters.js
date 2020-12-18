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
  bulkSize = 8,
) {
  try {
    console.time(`OSINT-indexCharacters`);
    const { token } = await keys_db.findOne({ tags: queryKeys });
    await characters_db.syncIndexes()
    await characters_db.collection.createIndex({ 'hash.a': 1, 'updatedAt': 1, 'statusCode': 1 }, { name: `OSINT-${indexCharacters.name}` })
    await characters_db
      .aggregate([
        {
          $match: { 'hash.a': { $exists: true } }
        },
        {
          $sort: { updatedAt: 1 }
        },
        {
          $group: {
            _id: { hash_a: '$hash.a' },
            characters: {
              $addToSet: {
                name: '$name',
                realm: '$realm'
              }
            },
          }
        },
      ])
      .allowDiskUse(true)
      .cursor({ batchSize: bulkSize })
      .exec()
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(async (block, iterations) => {
          if (block.characters.length) {
            let i = 0;
            for (const character of block.characters) {
              await getCharacter({
                name: character.name,
                realm: character.realm,
                updatedBy: `OSINT-indexCharacters`,
                token: token,
                guildRank: false,
                createOnlyUnique: false,
                iterations: iterations + (i++),
                forceUpdate: true
              });
            }
          }
        }, { parallel: bulkSize }
      )
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
    process.exit(0)
  }
})();
