const logs_db = require("../../db/logs_db");
const axios = require('axios');
//const characters_db = require("../../db/characters_db");

const pub_key = '71255109b6687eb1afa4d23f39f2fa76';
const private_key = '71255109b6687eb1afa4d23f39f2fa76';

async function indexLogs (queryInput = {}) {
    try {
        console.time(`VOLUSPA-${indexLogs.name}`);
        let documentBulk = [];
        const cursor = logs_db.find(queryInput).lean().cursor({batchSize: 5});
        cursor.on('data', async (documentData) => {
            console.time(`Bulk-${indexLogs.name}`);
            documentBulk.push(documentData);
            if (documentBulk.length === 5) {
                //console.log(documentBulk);
                cursor.pause();
                const promises = documentBulk.map(async (req) => {
                    try {
                        let { _id } = req;
                        let { exportedCharacters } = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${_id}?api_key=${pub_key}`).then(res => {
                            return res.data;
                        });
                        console.log(exportedCharacters)
                        //let upd_char = await getCharacter((req.realm).toLowerCase().replace(/\s/g,"-"), (req.name).toLowerCase(), token);
                        //upd_char.source = `VOLUSPA-${indexLogs.name}`;
                        //let {_id} = upd_char;
                        //console.info(`${_id}`);
/*                        return await characters_db.findByIdAndUpdate(
                            {
                                _id: _id
                            },
                            upd_char,
                            {
                                upsert : true,
                                new: true,
                                setDefaultsOnInsert: true,
                                lean: true
                            }
                        ).exec();*/
                    } catch (e) {
                        console.log(e)
                    }
                });
                await Promise.all(promises);
                documentBulk = [];
                //cursor.resume();
                console.timeEnd(`Bulk-${indexLogs.name}`);
            }
        });
        cursor.on('error', error => {
            //TODO we are not sure, recourse
            console.error(error);
            cursor.close();
        });
        cursor.on('close', () => {
            console.timeEnd(`VOLUSPA-${indexLogs.name}`);
            cursor.close();
            //indexLogs();
        });
    } catch (err) {
        console.error(`${indexLogs.name},${err}`);
    }
}

indexLogs();