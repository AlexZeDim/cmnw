/**
 * Mongo Models
 */
require('../../db/connection')
const logs_db = require('../../db/models/logs_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const axios = require('axios');
const getCharacter = require('./get_character');

/**
 * Parse all open logs from Kihra's WCL API (https://www.warcraftlogs.com/) for new characters for OSINT-DB (characters)
 * @param queryInput
 * @param bulkSize
 * @param queryKeys
 * @returns {Promise<void>}
 */

const pub_key = '71255109b6687eb1afa4d23f39f2fa76';

schedule.scheduleJob('0 3 * * *', async (
  t,
  bulkSize = 1,
  queryKeys = `OSINT-indexCharacters`,
) => {
  try {
    console.time(`OSINT-indexLogs`);
    const { token } = await keys_db.findOne({ tags: queryKeys });
    await logs_db
      .find({ isIndexed: false }, { timeout: false })
      .cursor({ batchSize: bulkSize })
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(
        async log => {
          try {
            /** Request WCL log by it's _id from API */
            const wcl_log = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${log._id}?api_key=${pub_key}`)
              .then(res => res.data || { exportedCharacters: [] });
            /** Only if exportedCharacters found in logs */
            if (wcl_log && wcl_log.exportedCharacters && wcl_log.exportedCharacters.length) {
              for (const character of wcl_log.exportedCharacters) {
                if (character.name && character.server) {
                  await getCharacter({ name: character.name, realm: { slug: character.server }, createdBy: `OSINT-indexLogs`, updatedBy: `OSINT-indexLogs`, token: token, guildRank: true, createOnlyUnique: true });
                }
              }
            }
            /** But even if not, we update logs status to avoid stockpiling */
            log.isIndexed = true;
            await log.save();
            console.info(`U,${log._id}`);
          } catch (error) {
            console.error(`E,OSINT-indexLogs,${error}`);
          }
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexLogs`);
    process.exit(0)
  }
});
