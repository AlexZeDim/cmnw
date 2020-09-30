/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
).then(r => r);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const keys_db = require('../db/keys_db');

/**
 * Modules
 */

const axios = require('axios');

/**
 * Update tokens from Blizzard API as a separate task
 * @returns {Promise<void>}
 */

(async () =>{
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
    await connection.close();
  } catch (e) {
    console.error(e);
  }
})();
