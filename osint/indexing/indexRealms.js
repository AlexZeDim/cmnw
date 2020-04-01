const battleNetWrapper = require('battlenet-api-wrapper');
const realms_db = require("../../db/realms_db");
const keys_db = require("../../db/keys_db");
const {connection} = require('mongoose');

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
            } else {
                realm.name_locale =  realm.name;
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