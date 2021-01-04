/**
 * Mongo Models
 */
require('../../db/connection')
const guild_db = require('../../db/models/guilds_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const getGuild = require('./get_guild');

/**
 * Indexing every guild in bulks from OSINT-DB for updated information
 * @param queryKeys {string} - token access
 * @param bulkSize {number} - block data per certain number
 * @returns {Promise<void>}
 */

(async (
  queryKeys = `OSINT-indexGuilds`,
  bulkSize = 1,
) => {
  try {
    console.time(`OSINT-indexGuilds`);
    const { token } = await keys_db.findOne({ tags: queryKeys });
    await guild_db
      .find()
      .lean()
      .cursor()
      .eachAsync(
        async ({ name, realm }, iterations) => {
          await getGuild({
            name: name,
            realm: realm,
            updatedBy: `OSINT-indexGuilds`,
            token: token,
            createOnlyUnique: false,
            iterations:  iterations
          });
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexGuilds`);
    process.exit(0)
  }
})();
