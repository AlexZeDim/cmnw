/**
 * Mongo Models
 */
require('../../db/connection');
const realms_db = require('../../db/realms_db');
const keys_db = require('../../db/keys_db');

/**
 * B.net wrapper
 */

const BlizzAPI = require('blizzapi');

/**
 * Index every realm in certain region and add it to OSINT-DB (realms)
 * @returns {Promise<void>}
 */

(async () => {
  try {
    console.time(`OSINT-indexRealms`);
    const { _id, secret, token } = await keys_db.findOne({ tags: `conglomerat` });
    /**
     * BlizzAPI
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });

    const realmsTicker = new Map([
      ['Gordunni', 'GRDNNI'],
      ['Lich King', 'LCHKNG'],
      ['Soulflayer', 'SLFLYR'],
      ['Deathguard', 'DTHGRD'],
      ['Deepholm', 'DEPHLM'],
      ['Greymane', 'GREYMN'],
      ['Galakrond', 'GLKRND'],
      ['Howling Fjord', 'HWFJRD'],
      ['Razuvious', 'RAZUVS'],
      ['Deathweaver', 'DTHWVR'],
      ['Fordragon', 'FRDRGN'],
      ['Borean Tundra', 'BRNTND'],
      ['Azuregos', 'AZURGS'],
      ['Booty Bay', 'BTYBAY'],
      ['Thermaplugg', 'TRMPLG'],
      ['Grom', 'GROM'],
      ['Goldrinn', 'GLDRNN'],
      ['Blackscar', 'BLKSCR'],
    ]);

    const { realms } = await api.query(`/data/wow/realm/index`, {
      timeout: 10000,
      params: { locale: 'en_GB' },
      headers: { 'Battlenet-Namespace': 'dynamic-eu' }
    });
    for (const { id, slug } of realms) {
      let realm = await realms_db.findById(id);
      if (!realm) {
        realm = new realms_db({
          _id: id,
        });
      }

      await api.query(`/data/wow/realm/${slug}`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      }).then(async realm_ => {
        realm.name = realm_.name;
        realm.category = realm_.category;
        realm.timezone = realm_.timezone;
        realm.is_tournament = realm_.is_tournament;

        if (realmsTicker.has(realm_.name)) {
          realm.ticker = realmsTicker.get(realm_.name);
        }

        realm.region = realm_.region.name;
        realm.type = realm_.type.name;
        realm.locale = realm_.locale.match(/../g).join('_');

        await api.query(`/data/wow/connected-realm/${parseInt(realm_['connected_realm'].href.replace(/\D/g, ''))}`, {
          timeout: 10000,
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'dynamic-eu' }
        }).then(({id, has_queue, status, population, realms}) => {
          realm.connected_realm_id = id;
          realm.has_queue = has_queue;
          realm.status = status.name;
          realm.population = population.name;
          realm.connected_realm = realms.map(({ slug }) => slug);
        })

        if (realm_.locale !== 'enGB') {
          const { name } = await api.query(`/data/wow/realm/${slug}`, {
            timeout: 10000,
            params: { locale: realm.locale },
            headers: { 'Battlenet-Namespace': 'dynamic-eu' }
          })
          if (name) {
            realm.name_locale = name;
            realm.slug_locale = name;
          }
        } else {
          realm.name_locale = realm.name;
          realm.slug_locale = realm.name;
        }
      });
      await realm.save()
      console.info(`C,${realm._id},${realm.slug}`)
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.timeEnd(`OSINT-indexRealms`);
  }
})();
