/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const personalities_db = require('../../db/models/personalities_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const { updateWarcraftLogs, updateWProgress, updateRaiderIO } = require('./updaters');
const { getLookingForGuild } = require('./get_lfg');
const { differenceBy } = require('lodash');

schedule.scheduleJob('*/5 * * * *', async () => {
  try {
    console.time(`OSINT-indexLFG`)
    const [t1, t0] = await Promise.all([
      await characters_db.find({ lfg: { status: true } }).limit(100), //TODO criteria
      await getLookingForGuild()
    ])
    /**
     * TODO revoke t1 status
     * If players already exists in OSINT with LFG
     * then => revoke their status for a new once, but keep result in variable
     * for future diffCompare
     *
       if (osint_lfg && osint_lfg.length) {
        await characters_db.updateMany({ isWatched: true }, { isWatched: false, $unset: { lfg : 1 } } )
        console.info(`LFG status revoked for ${osint_lfg.length} characters`)
      }
     * */

    const charactersDiff = differenceBy(t1, t0, '_id') //TODO validation for t1 and t0 arrays
    if (!Array.isArray(charactersDiff) || !charactersDiff.length) return
    for (const character of charactersDiff) {

      /** Request wow_progress and RIO for m+, pve progress and contacts */
      const [wcl, wp, rio] = await Promise.allSettled([
        await updateWarcraftLogs(character.name, character.realm.slug),
        await updateWProgress(character.name, character.realm.slug),
        await updateRaiderIO(character.name, character.realm.slug),
      ])
      const lfg = {};
      if (wcl && wcl.value) Object.assign(lfg, wcl.value)
      if (wp && wp.value) Object.assign(lfg, wp.value)
      if (rio && rio.value) Object.assign(lfg, rio.value)
      if (Object.keys(lfg).length > 0) Object.assign(character, lfg)

      if (character.personality && lfg.battle_tag) {
        await personalities_db.findOneAndUpdate({ _id: character.personality, 'aliases.value': { $ne: lfg.battle_tag }}, { '$push': {'aliases': { type: 'battle.tag', value: lfg.battle_tag } } })
      }
      //TODO character.updatedBy = 'OSINT-LFG-NEW', save of update
    }
  } catch (error) {
    console.error(error)
  } finally {
    console.timeEnd(`OSINT-indexLFG`)
    process.exit(0)
  }
});



