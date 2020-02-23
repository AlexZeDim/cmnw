const logs_db = require("../db/logs_db");
const Xray = require('x-ray');
let x = Xray();

//TODO pages and realms

/**
 *
 * @returns {Promise<void>}
 */

async function fromLogs () {
    try {
        let emptyPage = 0;
        for (let page = 0; page < 35; page++) {
            let indexVOLUSPA = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=488&page=${page}`,
                '.description-cell',
                [{
                    link: 'a@href',
                }]
            ).then((res) => {
                return res
            });
            //TODO check if exist, if exist don't add, else add
            if (indexVOLUSPA.length !== 0) {
                for (let i = 0; i < indexVOLUSPA.length; i++) {
                    let {link, realm} = indexVOLUSPA[i];
                    console.log(realm);
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
                                    if (error) console.error(error);
                                    console.info(log)
                                })
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