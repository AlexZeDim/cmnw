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

const characters_db = require("../../db/characters_db");
const realms_db = require("../../db/realms_db");
const keys_db = require("../../db/keys_db");
const guilds_db = require("../../db/guilds_db");

/**
 * getGuild indexing
 */

const getGuild = require('../getGuild');

/**
 * Modules
 */

const {toSlug} = require("../../db/setters");

/**
 * This function takes every unique guild name from OSINT-DB (characters) and
 * compares it with current OSINT-DB (guilds), adding new names to DB
 * @param queryFind
 * @param queryKeys
 * @returns {Promise<void>}
 */

async function fromCharacters (queryFind = {locale: "ru_RU"}, queryKeys = { tags: `OSINT-indexGuilds` }) {
    try {
        console.time(`OSINT-${fromCharacters.name}`);
        let realms = await realms_db.find(queryFind).lean().cursor();
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            const { token } = await keys_db.findOne(queryKeys);
            if ("slug" in realm) {
                let realm_slug = realm.slug;
                let guild_names = await characters_db.distinct("guild.name", { "realm.slug": realm_slug }).lean();
                for (let guild_name of guild_names) {
                    /**
                     * Check guild before insert
                     */
                    let guild = guilds_db.findById(toSlug(`${guild_name}@${realm_slug}`))
                    if (!guild) {
                        await getGuild(realm_slug, guild_name, token, `OSINT-${fromCharacters.name}`);
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`OSINT-${fromCharacters.name}`);
    } catch (err) {
        console.error(`${fromCharacters.name},${err}`);
    }
}

fromCharacters();