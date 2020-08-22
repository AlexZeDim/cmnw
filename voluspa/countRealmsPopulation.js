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

const realms_db = require('../db/realms_db');
const characters_db = require('../db/characters_db');
const guilds_db = require('../db/guilds_db');

async function countRealmsPopulation() {
  try {
    console.time(`VOLUSPA-${countRealmsPopulation.name}`);
    await realms_db.find({locale: 'ru_RU'}).cursor().eachAsync(async realm => {
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
      let guilds_alliance = await guilds_db.find({'realm.slug': realm.slug, faction: 'Alliance'}).distinct('_id')
      let guilds_horde = await guilds_db.find({'realm.slug': realm.slug, faction: 'Horde'}).distinct('_id')
      let guilds = {
        total: guilds_total.length,
        alliance: guilds_alliance.length,
        horde: guilds_horde.length,
      }
      realm.players = players
      realm.guilds = guilds
      realm.save()
      console.info(`U,${realm.name_locale}`)
    })
    connection.close();
    console.timeEnd(`VOLUSPA-${countRealmsPopulation.name}`);
  } catch (err) {
    console.error(`${countRealmsPopulation.name},${err}`);
  }
}

countRealmsPopulation();
