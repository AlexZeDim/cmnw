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
const persona_db = require('../../db/personalities_db');

/**
 * Modules
 */

const puppeteer = require('puppeteer');
const scraper = require('table-scraper');
const axios = require('axios');
const Xray = require('x-ray');
let x = Xray();

const { capitalize, toSlug } = require('../../db/setters');

(async function indexLFG() {
  try {
    console.time(`OSINT-${indexLFG.name}`)
    let exist_flag;
    let OSINT_LFG = await characters_db.find({isWatched: true}).lean();
    exist_flag = OSINT_LFG && OSINT_LFG.length;
    /**
     * If players already exists in OSINT with LFG
     * then => revoke their status for a new once, but keep result in variable
     * for future diffCompare
     * */
    if (exist_flag) {
      await characters_db.updateMany({ isWatched: true }, { isWatched: false, $unset: { lfg : 1 } } )
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
              const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
              const page = await browser.newPage();
              await page.goto(`https://www.warcraftlogs.com/character/eu/${character.realm.slug}/${character.name}#difficulty=5`);
              const [getXpath] = await page.$x('//div[@class=\'best-perf-avg\']/b');
              const bestPrefAvg = await page.evaluate(name => name.innerText, getXpath);
              if (bestPrefAvg && bestPrefAvg !== '-') {
                character.lfg.wcl_percentile = parseFloat(bestPrefAvg)
              }
              await browser.close();

              /** Request wow_progress and RIO for m+, pve progress and contacts */
              await Promise.allSettled([
                await axios.get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=${character.realm.slug}&name=${character.name}&fields=mythic_plus_scores_by_season:current,raid_progression`)).then(response => {
                  if (response.data) {
                    if ('raid_progression' in response.data) {
                      let raid_progress = response.data.raid_progression;
                      let pve_progress = {};
                      for (const [key, value] of Object.entries(raid_progress)) {
                        pve_progress[key] = value.summary
                      }
                      character.lfg.progress = pve_progress;
                    }
                    if ('mythic_plus_scores_by_season' in response.data) {
                      let rio_score = response.data.mythic_plus_scores_by_season
                      if (rio_score && rio_score.length) {
                        for (let rio of rio_score) {
                          if ('scores' in rio) {
                            character.lfg.rio = rio.scores.all
                          }
                        }
                      }
                    }
                  }
                }).catch(e => e),
                await x(
                  encodeURI(`https://www.wowprogress.com/character/eu/${character.realm.slug}/${character.name}`),
                  '.registeredTo',
                  ['.language']
                ).then(wow_progress => {
                  if (wow_progress && wow_progress.length) {
                    for (let info of wow_progress) {
                      let [key, value] = info.split(':')
                      if (key === 'Battletag') {
                        character.lfg.battle_tag = value;
                      }
                      if (key === 'Looking for guild') {
                        if (value.includes('ready to transfer')) {
                          character.lfg.transfer = true;
                        }
                        if (value.includes('without transfer')) {
                          character.lfg.transfer = false;
                        }
                      }
                      if (key === 'Raids per week') {
                        if (value.includes(' - ')) {
                          let [from, to] = value.split(' - ');
                          character.lfg.days_from = parseInt(from);
                          character.lfg.days_to = parseInt(to)
                        }
                      }
                      if (key === 'Specs playing') {
                        if (value === 'dd') {
                          character.lfg.role = 'DPS'
                        } else {
                          character.lfg.role = capitalize(value)
                        }
                      }
                    }
                  }
                })
              ])

              /** Update alias and codename for persona_db */
              if (character.personality) {
                let persona = await persona_db.findById(character.personality)
                if (persona && character.lfg.battle_tag) {
                  persona.aliases.addToSet({
                    type: 'battle.tag',
                    value: character.lfg.battle_tag
                  })
                  if (!persona.codename) {
                    persona.codename = character.lfg.battle_tag.toString().split('#')[0]
                  }
                  console.info(`U,${persona._id},${character.lfg.battle_tag}`)
                  await persona.save();
                }
              }

              /** Update status */
              character.updatedBy = 'OSINT-LFG-NEW'
            }
          }

          character.isWatched = true;
          await character.save()
          console.info(`U,${character._id},${character.updatedBy}`)
        }
      }
    }
    console.timeEnd(`OSINT-${indexLFG.name}`)
    connection.close();
  } catch (error) {
    console.error(error)
  }
})();



