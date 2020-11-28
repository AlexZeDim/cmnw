/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');
const keys_db = require('../../db/models/keys_db');
const personalities_db = require('../../db/models/personalities_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const getCharacter = require('./get_character');
const scraper = require('table-scraper');
const axios = require('axios');
const Xray = require('x-ray');
let x = Xray();

const { toSlug } = require('../../db/setters');

schedule.scheduleJob('*/5 * * * *', async () => {
  try {
    console.time(`OSINT-indexLFG`)
    const { token } = await keys_db.findOne({ tags: `OSINT-indexGuilds` });
    const osint_lfg = await characters_db.find({ isWatched: true }).lean();
    /**
     * If players already exists in OSINT with LFG
     * then => revoke their status for a new once, but keep result in variable
     * for future diffCompare
     * */
    if (osint_lfg && osint_lfg.length) {
      await characters_db.updateMany({ isWatched: true }, { isWatched: false, $unset: { lfg : 1 } } )
      console.info(`LFG status revoked for ${osint_lfg.length} characters`)
    }
    /**
     * Receive HTML table from Kernel's WoWProgress
     */
    let lfg = await scraper
      .get('https://www.wowprogress.com/gearscore/?lfg=1&raids_week=&lang=ru&sortby=ts')
      .then(function(tableData) {
        return tableData[0] || [];
      });
    /**
     * Make sure that table is exist
     */
    if (lfg && lfg.length) {
      for (let lfgElement of lfg) {
        /** For each player */
        let character_name, character_realm;
        /** Extract name and realm */
        for (const [key, value] of Object.entries(lfgElement)) {
          if (key === 'Character') {
            character_name = value
          }
          if (key === 'Realm') {
            let realm = await realms_db.findOne({ $text: { $search: value.split('-')[1] } }, { _id: 1, slug: 1, name: 1 }).lean();
            if (realm && realm.slug) {
              character_realm = realm.slug;
            }
          }
        }
        /** Find character in OSINT DB */
        if (character_name && character_realm) {
          await getCharacter(
            { name: character_name, realm: { slug: character_realm }, createdBy: `OSINT-LFG`, updatedBy: `OSINT-LFG` },
            token,
            true,
            false
          )
          const _id = `${toSlug(character_name)}@${character_realm}`
          if (!_id) continue
          const character = await characters_db.findById(_id)
          if (!character) {
            console.info(`E,${character_name},${character_realm}`)
            continue
          }
          /** If we have something to compare with */
          const player_flag = osint_lfg.some(({name, realm}) => (name === character.name && realm.slug === character.realm.slug));
          if (player_flag) {
            character.updatedBy = 'OSINT-LFG'
          } else {
            /** Evaluate Logs Performance */
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage();
            await page.goto(`https://www.warcraftlogs.com/character/eu/${character.realm.slug}/${character.name}#difficulty=5`);
            const [getXpath] = await page.$x('//div[@class=\'best-perf-avg\']/b');
            if (getXpath) {
              const bestPrefAvg = await page.evaluate(name => name.innerText, getXpath);
              if (bestPrefAvg && bestPrefAvg !== '-') {
                character.lfg.wcl_percentile = parseFloat(bestPrefAvg)
              }
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
                      character.lfg.battle_tag = value.replace(' ', '');
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
                      character.lfg.role = value
                    }
                  }
                }
              })
            ])

            /** Update status */
            character.updatedBy = 'OSINT-LFG-NEW'
          }

          if (character.personality && character.lfg && character.lfg.battle_tag) {
            await personalities_db.findOneAndUpdate({ _id: character.personality, 'aliases.value': { $ne: character.lfg.battle_tag }}, { '$push': {'aliases': { type: 'battle.tag', value: character.lfg.battle_tag } } })
          }

          character.isWatched = true;
          await character.save()
        }
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    console.timeEnd(`OSINT-indexLFG`)
    process.exit(0)
  }
});



