/**
 * Mongo Models
 */
require('../../db/connection')
const wowtoken_db = require('../../db/models/wowtoken_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const BlizzAPI = require('blizzapi');
const { Round2 } = require('../../db/setters');

/**
 * @param key {string}
 * @returns {Promise<void>}
 */

const indexWoWToken = async (key = 'DMA') => {
  try {
    console.time(`DMA-${indexWoWToken}`);

    const { _id, secret, token } = await keys_db.findOne({ tags: key });

    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });

    const { last_updated_timestamp, price, lastModified } = await api.query(`/data/wow/token/index`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    })

    const wowtoken = await wowtoken_db.findById(last_updated_timestamp);

    if (!wowtoken) {
      await wowtoken_db.create({
        _id: last_updated_timestamp,
        region: 'eu',
        price: Round2(price / 10000),
        lastModified: lastModified,
      })
    }

  } catch (error) {
    console.error(`DMA-${indexWoWToken.name}:${error}`);
  } finally {
    console.timeEnd(`DMA-${indexWoWToken.name}`);
    process.exit(0)
  }
}

schedule.scheduleJob('0/10 * * * *', () => {
  indexWoWToken('DMA').then(r => r)
})
