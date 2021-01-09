/**
 * Mongo Models
 */
require('../../db/connection');
const realms_db = require('../../db/models/realms_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const BlizzAPI = require('blizzapi');
const { getRealm, getWarcraftLogsID, countPopulation } = require('./updaters');

const indexRealms = async () => {
  const time = new Date().getTime()
  console.time(`OSINT-${indexRealms.name}-${time}`);
  try {
    const { _id, secret, token } = await keys_db.findOne({ tags: `conglomerat` });
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });
    const [realm_list, wcl_ids ] = await Promise.allSettled([
      await api.query(`/data/wow/realm/index`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      }),
      await getWarcraftLogsID(247, 517)
    ])
    console.log(wcl_ids)
    if (realm_list && realm_list.status === 'fulfilled') {
      if (!realm_list.value.realms || !Array.isArray(realm_list.value.realms)) return
      for (const { id, slug } of realm_list.value.realms) {
        console.time(`${id}-${slug}`);
        let realm = await realms_db.findById(id);
        if (!realm) {
          realm = new realms_db({
            _id: id,
          });
        }

        const [ summary, populations ] = await Promise.allSettled([
          await getRealm(slug, api),
          await countPopulation(slug)
        ]);

        if (summary && summary.value) {
          Object.assign(realm, summary.value)
        }

        if (populations && populations.value) {
          realm.populations.push(populations.value)
          if (realm.populations.length > 10) {
            realm.populations.shift()
          }
          realm.markModified('populations')
        }

        if (wcl_ids && wcl_ids.value.has(realm.name)) {
          realm.wcl_id = wcl_ids.value.get(realm.name)
        } else if (wcl_ids && wcl_ids.value.has(realm.name_locale)) {
          realm.wcl_id = wcl_ids.value.get(realm.name_locale)
        }

        await realm.save()
        console.timeEnd(`${id}-${slug}`)
      }
    }
  } catch (error) {
    console.error(`E,${indexRealms.name}:${error}`)
  } finally {
    console.timeEnd(`OSINT-${indexRealms.name}-${time}`);
    process.exit(0)
  }
};

//schedule.scheduleJob('0 5 1,9,17,26 * *', () => {
  indexRealms().then(r => r)
//})
