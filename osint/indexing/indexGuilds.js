/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const guild_db = require('../../db/guilds_db');
const keys_db = require('../../db/keys_db');

/**
 * getGuild indexing
 */

const getGuild = require('../getGuild');

/**
 * Indexing every guild in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

(async (
  queryFind = {},
  queryKeys = { tags: `OSINT-indexGuilds` },
  bulkSize = 2,
) => {
  try {
    console.time(`OSINT-indexGuilds`);
    const { token } = await keys_db.findOne(queryKeys);
    await guild_db
      .find(queryFind)
      .lean()
      .cursor({ batchSize: bulkSize })
      .eachAsync(
        async ({ _id }) => {
          const [guildName, realmSlug] = _id.split('@');
          await getGuild(realmSlug, guildName, token, `OSINT-indexGuilds`);
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
