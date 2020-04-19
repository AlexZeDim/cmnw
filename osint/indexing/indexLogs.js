const logs_db = require("../../db/logs_db");
const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");
const {connection} = require('mongoose');
const axios = require('axios');

const pub_key = '71255109b6687eb1afa4d23f39f2fa76';

async function indexLogs (queryInput = {isIndexed:false}, bulkSize = 1) {
    try {
        console.time(`OSINT-${indexLogs.name}`);
        let documentBulk = [];
        const cursor = logs_db.find(queryInput).lean().cursor({batchSize: bulkSize});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length === bulkSize) {
                console.time(`================`);
                cursor.pause();
                const promises = documentBulk.map(async (req) => {
                    try {
                        let { _id } = req;
                        let { exportedCharacters } = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${_id}?api_key=${pub_key}`).then(res => {
                            return res.data;
                        }).catch(e => console.error(`${indexLogs.name},${e.response.status},${e.response.config.url.match(/(.{16})\s*$/g)[0]}`));
                        if (exportedCharacters) {
                            for (let i = 0; i < exportedCharacters.length; i++) {
                                if (exportedCharacters[i].server === 'Пиратская бухта') exportedCharacters[i].server = 'Пиратская Бухта';
                                if (exportedCharacters[i].server.match(/’/g)) exportedCharacters[i].server = exportedCharacters[i].server.replace(/’/g,`'`);
                                let {slug} = await realms_db.findOne({
                                    $or:
                                        [
                                            {'name_locale': exportedCharacters[i].server},
                                            {'name': exportedCharacters[i].server},
                                        ]
                                }).lean().exec();
                                if (!slug) {
                                    slug = exportedCharacters[i].server.toLowerCase().replace(/\s/g,"-");
                                }
                                let character_ = await characters_db.findById(`${exportedCharacters[i].name.toLowerCase()}@${slug}`);
                                if (!character_) {
                                    characters_db.create(                                {
                                        _id: `${exportedCharacters[i].name.toLowerCase()}@${slug}`,
                                        name: exportedCharacters[i].name,
                                        realm_slug: slug,
                                        createdBy: `OSINT-${indexLogs.name}`,
                                        updatedBy: `OSINT-${indexLogs.name}`
                                    }).then(function (ch, error) {
                                        if (error) console.error(`E,${error}`);
                                        console.info(`C,${ch._id}`)
                                    })
                                } else {
                                    console.info(`E,${character_._id}`)
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