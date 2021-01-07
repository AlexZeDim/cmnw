/**
 * Mongo Models
 */
require('../db/connection')
const keys_db = require('../db/models/keys_db');

/**
 * Modules
 */

const axios = require('axios');
const schedule = require('node-schedule');

/**
 * Update tokens from Blizzard API as a separate task
 * @returns {Promise<void>}
 */

schedule.scheduleJob('0-59 * * * *', async () => {
  const t = Date.now();
  try {
    console.info(`CORE-TOKEN-${t}`)
    console.time(`CORE-TOKEN-${t}`)
    await keys_db.find({ tags: 'BlizzardAPI' }).cursor().eachAsync(async key => {
      if ('secret' in key) {
        const key_pair = await axios({
          url: `https://eu.battle.net/oauth/token`,
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: {
            grant_type: 'client_credentials'
          },
          auth: {
            username: key._id,
            password: key.secret
          }
        }).then(res => { return res.data } );

        if ('access_token' in key_pair && 'expires_in' in key_pair) {
          key.token = key_pair.access_token
          key.expired_in = key_pair.expires_in
          await key.save()
          console.info(key)
        }
      }
    });
  } catch (e) {
    console.error(e);
  } finally {
    console.timeEnd(`CORE-TOKEN-${t}`)
    process.exit(0)
  }
});

