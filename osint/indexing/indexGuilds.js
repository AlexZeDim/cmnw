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

const guild_db = require("../../db/guilds_db");
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

async function indexGuild (queryFind = '', queryKeys = { tags: `OSINT-indexGuilds` }, bulkSize = 1) {
    try {
        console.time(`OSINT-${indexGuild.name}`);
        let guild_Array = [];
        const { token } = await keys_db.findOne(queryKeys);
        let cursor = await guild_db.find(queryFind).lean().cursor({batchSize: bulkSize});
        cursor.on('data', async ({_id}) => {
            const [guildName, realmSlug] = _id.split('@');
            guild_Array.push(getGuild(realmSlug, guildName, token, `OSINT-${indexGuild.name}`));
            if (guild_Array.length >= bulkSize) {
                cursor.pause();
                console.time(`================================`);
                ({ token } = await keys_db.findOne(queryKeys));
                await Promise.all(guild_Array);
                guild_Array.length = 0;
                cursor.resume();
                console.timeEnd(`================================`);
            }
        });
        cursor.on('error', error => {
            console.error(`E,OSINT-${indexGuild.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 180000));
            connection.close();
            console.timeEnd(`OSINT-${indexGuild.name}`);
        });
    } catch (err) {
        console.error(`${indexGuild.name},${err}`);
    }
}

indexGuild();