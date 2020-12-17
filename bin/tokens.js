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
  try {
    console.time('CORE-TOKEN')
    await keys_db.find({ tags: 'BlizzardAPI' }).cursor().eachAsync(async key => {
      const { access_token, expires_in } = await axios({
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

      if (access_token && expires_in) {
        key.token = access_token
        key.expired_in = expires_in
        await key.save()
        console.info(`U,${_id},${expires_in}`)
      }
    });
  } catch (e) {
    console.error(e);
  } finally {
    console.timeEnd('CORE-TOKEN')
    process.exit(0)
  }
});

