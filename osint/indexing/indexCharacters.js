/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/characters_db');
const keys_db = require('../../db/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const getCharacter = require('../getCharacter');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

schedule.scheduleJob('55 19 17 * *', async (
  t,
  queryKeys = { tags: `OSINT-indexCharacters` },
  bulkSize = 8,
) => {
  try {
    console.time(`OSINT-indexCharacters`);
    let { token } = await keys_db.findOne(queryKeys);
    await characters_db
      .find()
      .sort({'updatedAt': 1})
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
    console.timeEnd(`OSINT-indexCharacters`);
  }
});
