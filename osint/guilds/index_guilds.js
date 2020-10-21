/**
 * Mongo Models
 */
require('../../db/connection')
const guild_db = require('../../db/models/guilds_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const getGuild = require('./get_guild');

/**
 * Indexing every guild in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

schedule.scheduleJob('30 21 * * *', async (
  t,
  queryFind = {},
  queryKeys = { tags: `OSINT-indexGuilds` },
  bulkSize = 5,
) => {
  try {
    console.time(`OSINT-indexGuilds`);
    const { token } = await keys_db.findOne(queryKeys);
    await guild_db
      .find(queryFind)
      .sort({ 'updatedAt': 1 })
      .cursor()
      .eachAsync(
        async ({ name, realm }, i) => {
          await getGuild({
            name: name,
            realm: realm,
            updatedBy: `OSINT-indexGuilds`
          }, token, false, i);
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexGuilds`);
  }
});
