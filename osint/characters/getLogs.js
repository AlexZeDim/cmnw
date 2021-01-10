/**
 * Mongo Models
 */
require('../../db/connection')
const logs_db = require('../../db/models/logs_db');
const realms_db = require('../../db/models/realms_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const { range } = require('lodash');
const Xray = require('x-ray');
const x = Xray();



const getLogs = async (
  delay = 10,
  startPage = 0,
  endPage = 100,
  faultTolerance = 400,
  emptyPage = 2,
) => {
  try {
    console.time(`OSINT-${getLogs.name}`);
    await realms_db
      .find()
      .lean()
      .cursor({ batchSize: 1 })
      .addCursorFlag('noCursorTimeout',true)
      .eachAsync(async ({ wcl_id, slug }, i) => {

        console.time(`${slug}-${i}`)

        const page_config = {
          existing_page: 0,
          fault_tolerance: 0,
        }

        const pages = range(startPage, endPage, 1);

        for (const page of pages) {
          /** Creating safe delay */
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          /** Parsing page with the requested delay */
          const index_logs = await x(
            `https://www.warcraftlogs.com/zone/reports?zone=26&server=${wcl_id}&page=${page}`,
            '.description-cell',
            [
              {
                link: 'a@href',
              },
            ],
          ).then(res => res);
          /** If parsed page have results */
          if (index_logs && index_logs.length) {
            for (const index_log of index_logs) {
              if ('link' in index_log) {
                const link = index_log.link.match(/(.{16})\s*$/g)[0];
                if (index_log.link.includes('reports')) {
                  /*** Check logs in collection */
                  const log = await logs_db.findById(link);

                  if (log) {
                    /** If exists counter +1*/
                    page_config.fault_tolerance += 1;
                    console.info(`E,${log._id}@${log.realm},${page_config.fault_tolerance}`);
                  } else {
                    /** Else, counter -1 and create in DB */
                    if (page_config.fault_tolerance > 1) page_config.fault_tolerance -= 1;

                    await logs_db.create({
                      _id: link,
                      realm: slug,
                      isIndexed: false,
                      source: `OSINT-fromLogs`,
                    });

                    console.info(`C,${link}@${slug}`);
                  }
                }
              }
            }
            /**
             * If indexing logs on page have ended
             * and page fault tolerance is more then
             * config, then break for loop
             */
            if (page_config.fault_tolerance >= faultTolerance) {
              console.info(`E,${page}:${slug},${page_config.fault_tolerance}`);
              break;
            }
          }
          /**
           * If page doesn't have any logs
           * we add +1 to empty pages and
           * if empty >= emptyPage we stop
           * iterating
           */
          if (!index_logs.length) {
            page_config.existing_page += 1;
            console.info(`E,${wcl_id}:${slug},${page_config.existing_page}`);
            if (page_config.existing_page >= emptyPage) break;
          }
        }

        console.timeEnd(`${slug}-${i}`)
      }, { parallel: 1 });
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-${getLogs.name}`);
    process.exit(0)
  }
};


schedule.scheduleJob('0 2 * * *', () => {
  getLogs().then(r => r)
})
