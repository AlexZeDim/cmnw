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

const guilds_old_db = require("../../db/guilds_old");
const keys_db = require("../../db/keys_db");

/**
 * getGuild indexing
 */

const getGuild = require('../getGuild');

/**
 * Indexing every guild in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

async function G (queryFind = {name:"Депортация"}, queryKeys = { tags: `OSINT-indexGuilds` }, bulkSize = 2) {
    try {
        console.time(`OSINT-${G.name}`);
        const { token } = await keys_db.findOne(queryKeys);
        await guilds_old_db.find(queryFind).lean().cursor({batchSize: bulkSize}).eachAsync(async ({_id, createdBy}) => {
            const [guildName, realmSlug] = _id.split('@');
            let updatedBy = `OSINT-indexGuild`;
            if (createdBy) {
                updatedBy = createdBy;
            }
            await getGuild(realmSlug, guildName, token, updatedBy)
        }, { parallel: bulkSize })
        connection.close();
        console.timeEnd(`OSINT-${G.name}`);
    } catch (err) {
        console.error(`${G.name},${err}`);
    }
}

G();