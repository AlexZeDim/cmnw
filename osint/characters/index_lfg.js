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

const index_LFG = async () => {
  const t = Date.now()
  try {
    console.time(`OSINT-${index_LFG.name}-${t}`)

    const t0 = await characters_db.find({ 'lfg.status': true }, { _id: 1 }).hint({ 'lfg.status': 1 }).limit(100).lean();
    const t1 = await getLookingForGuild();

    /**
     * Revoke characters status from T1
     */
    if (t0.length) {
      const status_revoked = await characters_db.updateMany({ 'lfg.status': true }, { 'lfg.status': false, 'lfg.new': false } )
      console.info(`Status revoked for ${status_revoked.nModified} characters`)
    }

    /**
     * Update status: true from T0
     */
    if (t1.length) {
      const status_updated = await characters_db.updateMany({ _id: { $in: t1.map(c => c._id) } }, { 'lfg.status': true, 'lfg.new': false })
      console.info(`Status updated for ${status_updated.nModified} characters`)
    }

    const charactersDiff = differenceBy(t1, t0, '_id')

    if (!Array.isArray(charactersDiff) || !charactersDiff.length) return
    console.info(`${charactersDiff.length} characters have been added to queue`)
    for (const { _id } of charactersDiff) {
      const character = await characters_db.findById(_id);
      console.log(!character.realm)

      if (!character || !character.realm) continue
      /** Request wow_progress and RIO for m+, pve progress and contacts */
      const [wcl, wp, rio] = await Promise.allSettled([
        await updateWarcraftLogs(character.name, character.realm.slug),
        await updateWProgress(character.name, character.realm.slug),
        await updateRaiderIO(character.name, character.realm.slug),
      ])
      const lfg = { status: true, new: true };
      if (wcl && wcl.value) Object.assign(lfg, wcl.value)
      if (wp && wp.value) Object.assign(lfg, wp.value)
      if (rio && rio.value) Object.assign(lfg, rio.value)

      if (character.personality && lfg.battle_tag) {
        await personalities_db.findOneAndUpdate({ _id: character.personality, 'aliases.value': { $ne: lfg.battle_tag }}, { '$push': {'aliases': { type: 'battle.tag', value: lfg.battle_tag } } })
      }

      if (Object.keys(lfg).length > 2) {
        Object.assign(character, { lfg: lfg });
        await character.save();
        console.info(`U,${character._id},${character.lfg}`)
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    console.time(`OSINT-${index_LFG.name}-${t}`)
    process.exit(0)
  }
}

schedule.scheduleJob('*/5 * * * *', async function(){
  await index_LFG()
})

