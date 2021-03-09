import '../db/mongo/connection';
import { range } from 'lodash';
import { KeysModel } from "../db/mongo/models/keys.model";
import { RealmModel } from '../db/mongo/models/realms.model';
import { queueLogs } from "./osint.queue";
import Xray from 'x-ray';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const indexLogs = async () => {
  try {
    const x = Xray();
    const key = await KeysModel.findOne({ tags: 'BlizzardAPI' });
    if (!key) return
    await RealmModel
      .find()
      .limit(1)
      .lean()
      .cursor({ batchSize: 1 })
      .eachAsync(async realm => {
        const
          pages = range(0, 100, 1),
          page_config = {
            existing_page: 0,
            exists_log: 0,
            fault_page: 2,
            fault_tolerance: 400
          };

        //TODO review exit
        for (const page of pages) {
          const index_logs = await x(
            `https://www.warcraftlogs.com/zone/reports?zone=26&server=${realm.wcl_id}&page=${page}`,
            '.description-cell',
            [
              {
                link: 'a@href',
              },
            ],
          ).then(res => res);
          /** If parsed page have results */
          if (index_logs && Array.isArray(index_logs) && index_logs.length) {
            for (const index_log of index_logs) {
              console.log(page_config)
              if ('link' in index_log) {
                const [link]: string = index_log.link.match(/(.{16})\s*$/g);
                if (index_log.link.includes('reports')) {
                  /** Check logs in collection */
                  const existingJob = await queueLogs.getJob(link);

                  if (existingJob) {
                    page_config.exists_log += 1;
                  } else {
                    if (page_config.exists_log > 1) {
                      page_config.exists_log -= 1;
                    }
                    await queueLogs.add(link, {
                      _id: link,
                      wcl: process.env.WCL,
                      clientId: key._id,
                      clientSecret: key.secret,
                      accessToken: key.token,
                    }, {
                      jobId: link
                    })
                  }
                }
              }
              /**
               * If indexing logs on page have ended
               * and page fault tolerance is more then
               * config, then break for loop
               */
              if (page_config.exists_log >= page_config.fault_tolerance) {
                page_config.exists_log = 0
                break;
              }
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
            if (page_config.existing_page > page_config.fault_page) {
              page_config.existing_page = 0
              break;
            }
          }
        }
      })
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
}

indexLogs();
