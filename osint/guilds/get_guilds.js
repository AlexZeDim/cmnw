/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');
const keys_db = require('../../db/models/keys_db');

/**
 * getGuild indexing
 */

const getGuild = require('./get_guild');

/**
 * Modules
 */

const schedule = require('node-schedule');

/**
 * This function takes every unique guild name from OSINT-DB (characters) and
 * compares it with current OSINT-DB (guilds), adding new names to DB
 * @param queryFind
 * @param queryKeys
 * @returns {Promise<void>}
 */

schedule.scheduleJob('30 4 * * *', async (
  t,
  queryFind = { region: 'Europe' },
  queryKeys = { tags: `OSINT-indexGuilds` },
) => {
  try {
    console.time(`OSINT-fromCharacters`);
    await realms_db
      .find(queryFind)
      .maxTimeMS(0)
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout', true)
      .eachAsync(
        async realm => {
          if (realm.slug) {
            const { token } = await keys_db.findOne(queryKeys);
            let guild_slugs = await characters_db
              .distinct('guild.slug', {
                'realm.slug': realm.slug,
              })
              .lean();
            for (let guild_slug of guild_slugs) {
              await getGuild(
                {
                  name: guild_slug,
                  realm: realm,
                  updatedBy: `OSINT-fromCharacters`
                },
                token,
                true
              );
            }
          }
        },
        { parallel: 1 },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-fromCharacters`);
    process.exit(0)
  }
});
