require('./../../db/connection');
const characters_db = require('../../db/models/characters_db');
const BlizzAPI = require('blizzapi');
const updateSummary = require('./updateSummary');
const updatePets = require('./updatePets');

(async function T () {
  try {
    const t = await characters_db.findById('инициатива@gordunni')
    const api = new BlizzAPI({
      region: 'eu',
      clientId: '530992311c714425a0de2c21fcf61c7d',
      clientSecret: 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP',
      accessToken: 'EUEOpZURAnEH2VozWCPV0hdD2DMCzyYJnV'
    });
    //await updateSummary(t.name.toLowerCase(), t.realm.slug, api)
    await updatePets(t.name.toLowerCase(), t.realm.slug, api)
  } catch (e) {
    console.error(e)
  }
})();
