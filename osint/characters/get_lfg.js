const scraper = require('table-scraper');
const keys_db = require('../../db/models/keys_db');
const getCharacter = require('./get_character');

/**
 * Return array of characters _id as array from WoWProgress Looking for Guild queue
 * @returns {Promise<[{_id: string}]|*[]>}
 */
exports.getLookingForGuild = async () => {
  try {
    const characters = [];
    const { token } = await keys_db.findOne({ tags: `OSINT-indexGuilds` });
    const lfg_pages = await Promise.allSettled([
      await scraper.get('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts').then((tableData) => tableData[0] || []),
      await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then((tableData) => tableData[0] || [])
    ])
    await Promise.allSettled(lfg_pages.map(async req_promise => {
      if (req_promise.status !== 'fulfilled' || !Array.isArray(req_promise.value) || !req_promise.value.length) return characters
      await Promise.allSettled(
        req_promise.value.map(async c => {
          /**
           * We iterate character object
           */
          if ('Character' in c && 'Realm' in c) {
            const character = await getCharacter({
              name: c.Character.trim(),
              realm: {
                slug: c.Realm.split('-')[1].trim(),
              },
              createdBy: `OSINT-LFG`,
              updatedBy: `OSINT-LFG`,
              token: token,
              guildRank: true,
              createOnlyUnique: false
            })
            if (character) characters.push({ _id: character._id })
          }
        })
      )
    }))
    return characters
  } catch (error) {
    console.error(`E,getLookingForGuild,${error}`)
    return []
  }
};
