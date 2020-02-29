const logs_db = require("../db/logs_db");
const Xray = require('x-ray');
let x = Xray();

//TODO realms && zones

/**
 *
 * @returns {Promise<void>}
 */

async function fromLogs () {
    try {
        let emptyPage = 0;
        for (let page = 0; page < 50; page++) {
            let indexVOLUSPA = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=488&page=${page}`,
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
                        await logs_db.findById(
                            {
                                _id: link.match(/(.{16})\s*$/g)[0]
                            }
                        ).exec(async function (err, log) {
                            if (!log) {
                                await logs_db.create({
                                    _id: link.match(/(.{16})\s*$/g)[0],
                                    realm: 'gordunni', //TODO
                                    isIndexed: false,
                                    source: `VOLUSPA-${fromLogs.name}`
                                }).then(function (log, error) {
                                    if (error) console.error(`E,${link},${error}`);
                                    console.info(`C,${log._id}@${log.realm}`)
                                })
                            } else {
                                console.info(`E,${log._id}@${log.realm}`);
                            }
                        });
                    }
                }
            } else {
                emptyPage += 1;
                if (emptyPage > 2 ) process.exit(2);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

fromLogs();