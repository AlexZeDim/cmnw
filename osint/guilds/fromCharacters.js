/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const characters_db = require('../../db/characters_db');
const realms_db = require('../../db/realms_db');
const keys_db = require('../../db/keys_db');
const guilds_db = require('../../db/guilds_db');

/**
 * getGuild indexing
 */

const getGuild = require('../getGuild');

/**
 * Modules
 */

const { toSlug } = require('../../db/setters');

/**
 * This function takes every unique guild name from OSINT-DB (characters) and
 * compares it with current OSINT-DB (guilds), adding new names to DB
 * @param queryFind
 * @param queryKeys
 * @returns {Promise<void>}
 */

(async (
  queryFind = { region: 'Europe' },
  queryKeys = { tags: `OSINT-indexGuilds` },
) => {
  try {
    console.time(`OSINT-fromCharacters`);
    await realms_db
      .find(queryFind)
      .lean()
      .cursor()
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
              /**
               * Check guild before insert
               */
              let guild = await guilds_db
                .findById(`${toSlug(guild_slug)}@${realm.slug}`)
                .lean();
              if (!guild) {
                await getGuild(
                  realm.slug,
                  guild_slug,
                  token,
                  `OSINT-fromCharacters`
                );
              }
            }
          }
        },
        { parallel: 1 },
      );
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`OSINT-fromCharacters`);
  }
})();
