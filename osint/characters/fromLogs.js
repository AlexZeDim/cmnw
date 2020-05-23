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
        let realms = await realms_db.find(queryFind).lean().cursor();
        for (let realm = await realms.next(); realm != null; realm = await realms.next()) {
            let {wcl_id, slug} = realm;
            let ep_counter = 0;
            let ft_counter = 0;
            for (let page = startPage; page < endPage; page++) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
                const indexLogs = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=${wcl_id}&page=${page}`,
                    '.description-cell',
                    [{
                        link: 'a@href',
                    }]
                ).then((res) => {
                    return res
                });
                if (indexLogs.length) {
                    for (let index_log of indexLogs) {
                        if ("link" in index_log) {
                            let link = index_log.link.match(/(.{16})\s*$/g)[0]
                            if (index_log.link.includes('reports') === true) {
                                let log = await logs_db.findById({
                                    _id: link
                                }).lean();
                                if (!log) {
                                    if (ft_counter > 1) {
                                        ft_counter -= 1;
                                    }
                                    await logs_db.create({
                                        _id: link,
                                        realm: slug,
                                        isIndexed: false,
                                        source: `OSINT-${fromLogs.name}`
                                    }).then(function (log, error) {
                                        if (error) console.error(`E,${link},${error}`);
                                        console.info(`C,${log._id}@${log.realm}`)
                                    })
                                } else {
                                    ft_counter += 1;
                                    console.info(`E,${log._id}@${log.realm},${ft_counter}`);
                                }
                            }
                        }
                    }
                    if (ft_counter >= faultTolerance ) {
                        console.info(`E,${page}:${slug},${ft_counter}`);
                        break;
                    }
                } else {
                    console.info(`E,${wcl_id}:${slug},${ep_counter}`);
                    ep_counter += 1;
                    if (ep_counter === emptyPage) {
                        break;
                    }
                }
            }
        }
        connection.close();
        console.timeEnd(`OSINT-${fromLogs.name}`);
    } catch (err) {
        console.error(`${fromLogs.name},${err}`);
    }
}

fromLogs().then(r => r);