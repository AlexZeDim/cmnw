/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");
const keys_db = require("../../db/keys_db");

/**
 * B.net wrapper
 */

const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Index every realm in certain region and add it to OSINT-DB (realms)
 * @returns {Promise<void>}
 */

async function indexRealms () {
    try {
        console.time(`OSINT-${indexRealms.name}`);
        const { _id, secret, token } = await keys_db.findOne({ tags: `Depo` });
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        let {realms} = await bnw.WowGameData.getRealmsIndex();
        for (const {slug} of realms) {
            await bnw.init(_id, secret, token, 'eu', 'en_GB');
            let realm = await bnw.WowGameData.getRealm(slug);
            delete realm["_links"];
            realm.region = realm.region.name;
            realm.type = realm.type.name;
            realm.locale = realm.locale.match(/../g).join('_');
            let connected = await bnw.WowGameData.getConnectedRealm(parseInt(realm["connected_realm"].href.replace(/\D/g, "")));
            realm.connected_realm_id = connected.id;
            realm.has_queue = connected.has_queue;
            realm.status = connected.status.name;
            realm.population = connected.population.name;
            realm.connected_realm = connected["realms"].map(({slug}) => {
                return slug
            });
            if (realm.locale !== 'en_GB') {
                await bnw.init(_id, secret, token, 'eu', realm.locale);
                let {name} = await bnw.WowGameData.getRealm(slug);
                realm.name_locale = name;
                realm.slug_locale = name;
            } else {
                realm.name_locale = realm.name;
                realm.slug_locale = realm.name;
            }
            await realms_db.findByIdAndUpdate(realm.id,
                realm,
            {
                upsert : true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
                lean: true
            }).then(rl => console.info(`C,${rl._id},${rl.slug}`));
        }
        connection.close();
        console.timeEnd(`OSINT-${indexRealms.name}`);
    } catch (e) {
        console.log(e)
    }
}

indexRealms();