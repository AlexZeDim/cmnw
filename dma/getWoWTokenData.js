/**
 * Mongo Models
 */
require('../db/connection')
const { connection } = require('mongoose');
const wowtoken_db = require('../db/wowtoken_db');
const keys_db = require('../db/keys_db');

/**
 * Modules
 */

const BlizzAPI = require('blizzapi');
const { Round2 } = require('../db/setters');

/**
 * @param queryKeys
 * @returns {Promise<void>}
 */

(async (queryKeys = { tags: `DMA` }) => {
  try {
    console.time(`DMA-getWoWTokenData`);
    const { _id, secret, token } = await keys_db.findOne(queryKeys);
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });
    const {
      last_updated_timestamp,
      price,
      lastModified
    } = await api.query(`/data/wow/token/index`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    })
    const wt = await wowtoken_db
      .findOne({ region: 'eu' })
      .sort('-lastModified');
    if (price && lastModified) {
      let wowtoken = new wowtoken_db({
        _id: last_updated_timestamp,
        region: 'eu',
        price: Round2(price / 10000),
        lastModified: lastModified,
      });
      if (wt) {
        if (last_updated_timestamp > wt._id) {
          await wowtoken.save();
        }
      } else {
        await wowtoken.save();
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-getWoWTokenData`);
  }
})();
