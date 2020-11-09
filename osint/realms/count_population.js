/**
 * Mongo Models
 */
require('../../db/connection')
const realms_db = require('../../db/models/realms_db');
const characters_db = require('../../db/models/characters_db');
const guilds_db = require('../../db/models/guilds_db');

/**
 * Modules
 */

const schedule = require('node-schedule');

schedule.scheduleJob('0 5 1,15 * *', async () => {
  try {
    console.time(`OSINT-count_population`);
    await realms_db.find().cursor().eachAsync(async realm => {
      let players_total = await characters_db.find({'realm.slug': realm.slug}).distinct('_id')
      let players_alliance = await characters_db.find({'realm.slug': realm.slug, faction: 'Alliance'}).distinct('_id')
      let players_horde = await characters_db.find({'realm.slug': realm.slug, faction: 'Horde'}).distinct('_id')
      let players_max_level = await characters_db.find({'realm.slug': realm.slug, level: 120}).distinct('_id')
      let players_unique = await characters_db.find({'realm.slug': realm.slug}).distinct('personality')
      let players = {
        total: players_total.length,
        alliance: players_alliance.length,
        horde: players_horde.length,
        max_level: players_max_level.length,
        unique: players_unique.length,
      }
      let guilds_total = await guilds_db.find({'realm.slug': realm.slug}).distinct('_id')
      let guilds_alliance = await guilds_db.find({'realm.slug': realm.slug, faction: 'Alliance'}  ).distinct('_id')
      let guilds_horde = await guilds_db.find({'realm.slug': realm.slug, faction: 'Horde'}).distinct('_id')
      let guilds = {
        total: guilds_total.length,
        alliance: guilds_alliance.length,
        horde: guilds_horde.length,
      }
      realm.players = players
      realm.guilds = guilds
      await realm.save()
      console.info(`U,${realm.name_locale}`)
    })
  } catch (error) {
    console.error(`${error}`);
  } finally {
    console.timeEnd(`OSINT-count_population`);
    process.exit(0)
  }
});
