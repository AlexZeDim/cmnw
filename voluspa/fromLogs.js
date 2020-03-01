const logs_db = require("../db/logs_db");
const realms_db = require("../db/realms_db");
const {connection} = require('mongoose');
const Xray = require('x-ray');
let x = Xray();

//TODO realms && zones

/**
 *
 * @returns {Promise<void>}
 */

//TODO https://www.warcraftlogs.com/server/id/

async function fromLogs (delay = 5) {
    try {
        console.time(`VOLUSPA-${fromLogs.name}`);
        let realms = await realms_db.find({locale: 'ru_RU'}).lean().cursor();
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            let {wcl_id, slug} = realm;
            let emptyPage = 0;
            let faultTolerance = 0;
            for (let page = 0; page < 100; page++) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
                let indexVOLUSPA = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=${wcl_id}&page=${page}`,
                    '.description-cell',
                    [{
                        link: 'a@href',
                    }]
                ).then((res) => {
                    return res
                });
                if (indexVOLUSPA.length !== 0) {
                    for (let i = 0; i < indexVOLUSPA.length; i++) {
                        let {link} = indexVOLUSPA[i];
                        if (link.includes('reports') === true) {
                            let log = await logs_db.findById({
                                _id: link.match(/(.{16})\s*$/g)[0]
                            }).lean().exec();
                            if (!log) {
                                faultTolerance -= 1;
                                await logs_db.create({
                                    _id: link.match(/(.{16})\s*$/g)[0],
                                    realm: slug,
                                    isIndexed: false,
                                    source: `VOLUSPA-${fromLogs.name}`
                                }).then(function (log, error) {
                                    if (error) console.error(`E,${link},${error}`);
                                    console.info(`C,${log._id}@${log.realm}`)
                                })
                            } else {
                                faultTolerance += 1;
                                console.info(`E,${log._id}@${log.realm},${faultTolerance}`);
                            }
                        }
                    }
                    if (faultTolerance === 400 ) {
                        console.info(`E,${page}:${slug},${faultTolerance}`);
                        break;
                    }
                } else {
                    console.info(`E,${wcl_id}:${slug},${emptyPage}`);
                    emptyPage += 1;
                    if (emptyPage === 2 ) {
                        //realms.next();
                        break;
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`VOLUSPA-${fromLogs.name}`);
    } catch (e) {
        console.log(e);
    }
}

fromLogs();