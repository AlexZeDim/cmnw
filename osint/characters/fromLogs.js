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

/**
 * Modules
 */

const Xray = require('x-ray');
let x = Xray();

/**
 * Add all open logs from Kihra's WCL (https://www.warcraftlogs.com/) to OSINT-DB (logs)
 * @returns {Promise<void>}
 */

async function fromLogs (queryFind = {locale: 'ru_RU'}, delay = 10, startPage = 0, endPage = 100, faultTolerance = 400, emptyPage = 2) {
    try {
        console.time(`OSINT-${fromLogs.name}`);
        await realms_db.find(queryFind).lean().cursor({batchSize: 1}).eachAsync(async (realm) => {
            if (realm.slug && realm.wcl_id) {
                let {wcl_id, slug} = realm;
                let ep_counter = 0;
                let ft_counter = 0;
                for (let page = startPage; page < endPage; page++) {
                    /** Creating safe delay */
                    await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    /** Parsing page with the requested delay */
                    const indexLogs = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=${wcl_id}&page=${page}`,
                        '.description-cell',
                        [{
                            link: 'a@href',
                        }]
                    ).then((res) => {
                        return res
                    });
                    /** If parsed page have results */
                    if (indexLogs.length) {
                        for (let index_log of indexLogs) {
                            if ("link" in index_log) {
                                let link = index_log.link.match(/(.{16})\s*$/g)[0]
                                if (index_log.link.includes('reports') === true) {
                                    /*** Check logs in collection */
                                    let log = await logs_db.findById({ _id: link });

                                    if (log) {
                                        /** If exists counter +1*/
                                        ft_counter += 1;
                                        console.info(`E,${log._id}@${log.realm},${ft_counter}`);
                                    } else {
                                        /** Else, counter -1 and create in DB */
                                        if (ft_counter > 1) {
                                            ft_counter -= 1;
                                        }
                                        log = new logs_db({
                                            _id: link,
                                            realm: slug,
                                            isIndexed: false,
                                            source: `OSINT-${fromLogs.name}`
                                        })

                                        await log.save();
                                        console.info(`C,${log._id}@${log.realm}`)
                                    }
                                }
                            }
                        }
                        if (ft_counter >= faultTolerance ) {
                            console.info(`E,${page}:${slug},${ft_counter}`);
                            break;
                        }
                    } else {
                        /** If page doesn't have any logs, ep_counter +1 */
                        console.info(`E,${wcl_id}:${slug},${ep_counter}`);
                        ep_counter += 1;
                        if (ep_counter === emptyPage) {
                            break;
                        }
                    }
                }
            }
        }, { parallel: 1 });
        connection.close();
        console.timeEnd(`OSINT-${fromLogs.name}`);
    } catch (err) {
        console.error(`${fromLogs.name},${err}`);
    }
}

fromLogs();