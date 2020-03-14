const characters_db = require("../../db/characters_db");
const realms_db = require("../../db/realms_db");
const guild_db = require("../../db/guilds_db");
const {connection} = require('mongoose');

async function fromCharacters (queryFind = {locale: "ru_RU"}) {
    try {
        console.time(`VOLUSPA-${fromCharacters.name}`);
        let realms = await realms_db.find(queryFind).lean().cursor();
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            let {slug, name} = realm;
            let guild_names = await characters_db.distinct('guild', { realm_slug: slug }).lean().exec();
            for (let i = 0; i < guild_names.length; i++) {
                if (guild_names[i] !== '') {
                    let guild_ = await guild_db.findById(`${guild_names[i].toLowerCase().replace(/\s/g,"-")}@${slug}`);
                    if (!guild_) {
                        await guild_db.create({
                            _id: `${guild_names[i].toLowerCase().replace(/\s/g,"-")}@${slug}`,
                            slug: guild_names[i].toLowerCase().replace(/\s/g,"-"),
                            name: guild_names[i],
                            realm_slug: slug,
                            realm: name,
                            createdBy: `VOLUSPA-${fromCharacters.name}`
                        }).then(gld => console.info(`C,${gld._id}`));
                    } else {
                        console.info(`E,${guild_names[i]}@${slug}`)
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`VOLUSPA-${fromCharacters.name}`);
    } catch (err) {
        console.error(`${fromCharacters.name},${err}`);
    }
}

fromCharacters();