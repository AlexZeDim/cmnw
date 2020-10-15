/**
 * Mongo Models
 */
require('../db/connection')
const keys_db = require('../db/keys_db');

/**
 * Modules
 */

const axios = require('axios');
const schedule = require('node-schedule');

/**
 * Update tokens from Blizzard API as a separate task
 * @returns {Promise<void>}
 */

schedule.scheduleJob('*/1 * * * *', async function() {
  try {
    await keys_db.find().cursor().eachAsync(async ({ _id, secret })=> {
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
          username: _id,
          password: secret
        }
      }).then(res => { return res.data } );
      let token = await keys_db.updateOne(
        { _id: _id },
        { token: access_token, expired_in: expires_in },
      );
      if (token) console.info(`U,${_id},${expires_in}`);
    });
  } catch (e) {
    console.error(e);
  }
});

