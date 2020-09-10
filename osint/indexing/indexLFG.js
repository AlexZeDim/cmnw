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

const realms_db = require('../../db/realms_db');
const characters_db = require('../../db/characters_db');

/**
 * Modules
 */

const puppeteer = require('puppeteer');
const scraper = require('table-scraper');
//const axios = require('axios');

const { toSlug } = require('../../db/setters');
//const api_key = '71255109b6687eb1afa4d23f39f2fa76';

(async function IndexLFG() {
  try {
    let exist_flag;
    let OSINT_LFG = await characters_db.find({isWatched: true}).lean();
    exist_flag = OSINT_LFG && OSINT_LFG.length;
    /**
     * If players already exists in OSINT with LFG
     * then => revoke their status for a new once, but keep result in variable
     * for future diffCompare
     * */
    if (exist_flag) {
      await characters_db.updateMany({ isWatched: true }, { isWatched: false, wcl_percentile: undefined })
      console.info(`LFG status revoked for ${OSINT_LFG.length} characters`)
    }
    /**
     * Receive HTML table from Kernel's WoWProgress
     */
    let LFG = await scraper
      .get('https://www.wowprogress.com/gearscore/?lfg=1&raids_week=&lang=ru&sortby=ts')
      .then(function(tableData) {
        return tableData[0] || [];
      });
    /**
     * Make sure that table is exist
     */
    if (LFG && LFG.length) {
      for (let lfgElement of LFG) {
        /** For each player */
        let character_name, character_realm;
        /** Extract name and realm */
        for (const [key, value] of Object.entries(lfgElement)) {
          if (key === 'Character') {
            character_name = value
          }
          if (key === 'Realm') {
            let realm = await realms_db.findOne({
              $text: { $search: value.split('-')[1] },
            })
            if (realm) {
              character_realm = realm.slug;
            }
          }
        }
        /** Find character in OSINT DB */
        if (character_name && character_realm) {
          let character = await characters_db.findById(`${toSlug(character_name)}@${character_realm}`)
          /** Create it, if it doesn't exist */
          if (!character) {
            const getCharacter = require('../getCharacter');
            const keys_db = require('../../db/keys_db');
            const { token } = await keys_db.findOne({
              tags: `OSINT-indexCharacters`,
            });
            await getCharacter(
              character_realm,
              character_name,
              {},
              token,
              `OSINT-LFG`,
              true,
            );
            character = await characters_db
              .findById(`${toSlug(character_name)}@${character_realm}`)
          }
          /** If we have something to compare with */
          if (exist_flag) {
            let player_flag = OSINT_LFG.some(({name, realm}) => (name === character.name && realm.slug === character.realm.slug));
            if (player_flag) {
              character.updatedBy = 'OSINT-LFG'
            } else {
              /** Evaluate Logs Performance */
              const browser = await puppeteer.launch({headless: false});
              const page = await browser.newPage();
              await page.goto(`https://www.warcraftlogs.com/character/eu/${character.realm.slug}/${character.name}`);
              const [getXpath] = await page.$x('//div[@class=\'best-perf-avg\']/b');
              const bestPrefAvg = await page.evaluate(name => name.innerText, getXpath);
              if (bestPrefAvg && typeof bestPrefAvg === 'number') {
                console.log(bestPrefAvg)
                character.wcl_percentile = parseFloat(bestPrefAvg)
              }
              await browser.close();
              character.updatedBy = 'OSINT-LFG-NEW'
            }
          }
          character.isWatched = true;
          await character.save()
          console.info(`U,${character._id},${character.updatedBy}`)
        }
      }
    }
    connection.close();
  } catch (e) {
    console.error(e)
  }
})();



