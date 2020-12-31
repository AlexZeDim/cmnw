const Xray = require('x-ray');
const x = Xray();
const scraper = require('table-scraper');
const keys_db = require('../../db/models/keys_db');
const getCharacter = require('./get_character');

(async function T () {
  try {
    const { token } = await keys_db.findOne({ tags: `OSINT-indexGuilds` });
    const lfg_pages = await Promise.allSettled([
      await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then((tableData) => tableData[0] || []),
      await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/1/lfg.1/sortby.ts').then((tableData) => tableData[0] || []),
      await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/1/lfg.1/sortby.ts').then((tableData) => tableData[0] || [])
    ])
    if (lfg_pages && lfg_pages.length) {
      lfg_pages.map(req_promise => {
        if (req_promise.status === 'fulfilled') {
          //TODO promise.all await?
          req_promise.value.map(async c => {
            /**
             * We iterate character object
             */
            const character = {
              name: (c && 'Character' in c) ? c.Character : undefined,
              realm: {
                slug: (c && 'Realm' in c) ? c.Realm.split('-')[1] : undefined,
              },
              createdBy: `OSINT-LFG`,
              updatedBy: `OSINT-LFG`,
              token: token,
              guildRank: true,
              createOnlyUnique: false
            }
            if (character.name && character.realm.slug) {
              await getCharacter(character)
            }
            //TODO character
          })
        }
      })
    }
  }catch (e) {
    console.error(e)
  }
})();
