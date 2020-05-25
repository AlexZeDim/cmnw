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

const characters_old = require("../../db/characters_old");
const keys_db = require("../../db/keys_db");

/**
 * getCharacter indexing
 */

const moment = require('moment');
const getCharacter = require('../getCharacter');

/***
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number`
 * @returns {Promise<void>}
 */

async function T (queryFind = {statusCode: 200}, queryKeys = {tags: `OSINT-indexCharacters`}, bulkSize = 10) {
    try {
        console.time(`OSINT-${T.name}`);
        let {token} = await keys_db.findOne(queryKeys);
        await characters_old.find(queryFind).sort({updatedAt: 1}).lean().cursor({batchSize: bulkSize}).eachAsync(async (c) => {
            const [characterName, realmSlug] = c._id.split('@');
            let createdBy = ''
            if ("createdBy" in c) {
                createdBy = c.createdBy.replace(/VOLUSPA/gi, 'OSINT')
            }
            let character_Object = {
                logs: []
            }
            if (c.guild_history && c.guild_history.length > 0) {
                for (let guid_log of c.guild_history) {
                    switch (guid_log.action) {
                        case 'leaves':
                            character_Object.logs.push({
                                old_value: guid_log.name,
                                new_value: '',
                                action: guid_log.action,
                                message: `${c.name}@${c.realm} leaves ${guid_log.name} //  Rank: ${guid_log.rank}`,
                                before: moment(c.date).subtract(2, 'hours').toISOString(true),
                                after: moment(c.date).toISOString(true),
                            })
                            break;
                        case 'promoted':
                            character_Object.logs.push({
                                old_value: guid_log.rank+1,
                                new_value: guid_log.rank,
                                action: guid_log.action,
                                message: `${c.name}@${c.realm}#${guid_log.name}:${guid_log.id} was promoted from Rank ${guid_log.rank+1} to Rank ${guid_log.rank}`,
                                before: moment(c.date).subtract(2, 'hours').toISOString(true),
                                after: moment(c.date).toISOString(true),
                            })
                            break;
                        case 'demoted':
                            character_Object.logs.push({
                                old_value: guid_log.rank-1,
                                new_value: guid_log.rank,
                                action: guid_log.action,
                                message: `${c.name}@${c.realm}#${guid_log.name}:${guid_log.id} was demoted from Rank: ${guid_log.rank-1} to Rank: ${guid_log.rank}`,
                                before: moment(c.date).subtract(2, 'hours').toISOString(true),
                                after: moment(c.date).toISOString(true),
                            })
                            break;
                        case 'joins':
                            character_Object.logs.push({
                                old_value: '',
                                new_value: guid_log.name,
                                action: guid_log.action,
                                message: `${c.name}@${c.realm} joins ${guid_log.name} //  Rank: ${guid_log.rank}`,
                                before: moment(c.date).subtract(2, 'hours').toISOString(true),
                                after: moment(c.date).toISOString(true),
                            })
                            break;
                        default:
                            console.log(`Sorry, we are out of options.`);
                    }
                }
            }
            await getCharacter(realmSlug, characterName, character_Object, token, createdBy, false)
        }, { parallel: bulkSize }).catch(error => console.error(`E, OSINT-${T.name}, ${error}`))
        connection.close()
        console.timeEnd(`OSINT-${T.name}`);
    } catch (err) {
        console.error(`${T.name},${err}`);
    }
}

T()