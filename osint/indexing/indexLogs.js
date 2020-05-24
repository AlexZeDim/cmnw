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

const logs_db = require("../../db/logs_db");
const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");

/**
 * Modules
 */

const axios = require('axios');
const {toSlug} = require("../../db/setters");

/**
 * getGuild indexing
 */

const getCharacter = require('../getCharacter');

/**
 * Parse all open logs from Kihra's WCL API (https://www.warcraftlogs.com/) for new characters for OSINT-DB (characters)
 * @param queryInput
 * @param bulkSize
 * @param queryKeys
 * @returns {Promise<void>}
 */

const pub_key = '71255109b6687eb1afa4d23f39f2fa76';

async function indexLogs (queryInput = {isIndexed:false}, bulkSize = 1, queryKeys = {tags: `OSINT-indexCharacters`}) {
    try {
        console.time(`OSINT-${indexLogs.name}`);
        let documentBulk = [];
        const cursor = logs_db.find(queryInput).lean().cursor({batchSize: bulkSize});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length >= bulkSize) {
                console.time(`================`);
                cursor.pause();
                let {token} = await keys_db.findOne(queryKeys);
                const promises = documentBulk.map(async (req) => {
                    try {
                        let { _id } = req;
                        let { exportedCharacters } = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${_id}?api_key=${pub_key}`).then(res => {
                            return res.data;
                        }).catch(e => console.error(`${indexLogs.name},${e.response.status},${e.response.config.url.match(/(.{16})\s*$/g)[0]}`));
                        if (exportedCharacters.length) {
                            for (let character of exportedCharacters) {
                                let {slug} = await realms_db.findOne({
                                    $or:
                                        [
                                            {'slug_locale': character.server},
                                            {'name_locale': character.server},
                                            {'name': character.server},
                                        ]
                                }).lean()
                                if (slug) {
                                    let character_OSINT = await characters_db.findById(toSlug(`${character.name}@${slug}`));
                                    if (!character_OSINT) {
                                        await getCharacter(slug, character.name, {}, token, `OSINT-${indexLogs.name}`)
                                    }
                                }
                            }
                            return await logs_db.findByIdAndUpdate(_id, {isIndexed: true}).then(lg => console.info(`U,${lg._id}`));
                        }
                    } catch (e) {
                        console.log(e)
                    }
                });
                await Promise.all(promises);
                documentBulk.length = 0;
                cursor.resume();
                console.timeEnd(`================`);
            }
        });
        cursor.on('error', error => {
            console.error(`E,OSINT-${indexLogs.name},${error}`);
            cursor.close();
        });
        cursor.on('close', async () => {
            await new Promise(resolve => setTimeout(resolve, 60000));
            connection.close();
            console.timeEnd(`OSINT-${indexLogs.name}`);
        });
    } catch (error) {
        console.error(`${indexLogs.name},${error}`)
    }
}

indexLogs();