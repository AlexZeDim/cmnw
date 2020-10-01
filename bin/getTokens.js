/**
 * Mongo Models
 */
require('../db/connection')
const { connection } = require('mongoose');
const keys_db = require('../db/keys_db');

/**
 * Modules
 */

const axios = require('axios');

/**
 * Update tokens from Blizzard API as a separate task
 * @returns {Promise<void>}
 */

(async () => {
  try {
    await keys_db.find().cursor().eachAsync(async ({_id, secret} )=> {
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
  } finally {
    await connection.close();
  }
})();
