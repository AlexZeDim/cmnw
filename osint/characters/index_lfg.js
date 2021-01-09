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

    const [t1, t0] = await Promise.all([
      await characters_db.find({ 'lfg.status': true }).hint({ 'lfg.status': 1 }).limit(100),
      await getLookingForGuild()
    ])

    /**
     * Revoke characters status from T1
     */
    if (t1.length) {
      await characters_db.updateMany({ 'lfg.status': true }, { 'lfg.status': false, 'lfg.new': false } )
      console.info(`Status revoked for ${t1.length} characters`)
    }

    /**
     * Update status: true from T0
     */
    if (t0.length) {
      await characters_db.updateMany({ _id: { $in: t0.map(c => c._id) } }, { 'lfg.status': true, 'lfg.new': false })
    }

    /**
     *
     * @type {unknown[]}
     */
    const charactersDiff = differenceBy(t0, t1, '_id') //TODO validation for t1 and t0 arrays
    if (!Array.isArray(charactersDiff) || !charactersDiff.length) return
    for (const character of charactersDiff) {

      /** Request wow_progress and RIO for m+, pve progress and contacts */
      const [wcl, wp, rio] = await Promise.allSettled([
        await updateWarcraftLogs(character.name, character.realm.slug),
        await updateWProgress(character.name, character.realm.slug),
        await updateRaiderIO(character.name, character.realm.slug),
      ])
      const lfg = { new: true };
      if (wcl && wcl.value) Object.assign(lfg, wcl.value)
      if (wp && wp.value) Object.assign(lfg, wp.value)
      if (rio && rio.value) Object.assign(lfg, rio.value)
      if (Object.keys(lfg).length > 0) Object.assign(character, { lfg: lfg })

      if (character.personality && lfg.battle_tag) {
        await personalities_db.findOneAndUpdate({ _id: character.personality, 'aliases.value': { $ne: lfg.battle_tag }}, { '$push': {'aliases': { type: 'battle.tag', value: lfg.battle_tag } } })
      }
      await character.save();
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

