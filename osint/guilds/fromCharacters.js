/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

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

async function fromCharacters(
  queryFind = { region: 'Europe' },
  queryKeys = { tags: `OSINT-indexGuilds` },
) {
  try {
    console.time(`OSINT-${fromCharacters.name}`);
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
                .findById(toSlug(`${guild_slug}@${realm.slug}`))
                .lean();
              if (!guild) {
                await getGuild(
                  realm.slug,
                  guild_slug,
                  token,
                  `OSINT-${fromCharacters.name}`,
                );
              }
            }
          }
        },
        { parallel: 1 },
      );
    connection.close();
    console.timeEnd(`OSINT-${fromCharacters.name}`);
  } catch (err) {
    console.error(`${fromCharacters.name},${err}`);
  }
}

fromCharacters();
