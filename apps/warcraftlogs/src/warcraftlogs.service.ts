import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Realm, WarcraftLogs } from '@app/mongo';
import { Model } from "mongoose";
import { range } from 'lodash';
import Xray from 'x-ray';

@Injectable()
export class WarcraftlogsService {
  private readonly logger = new Logger(
    WarcraftlogsService.name, true,
  );

  private readonly x = Xray();

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(WarcraftLogs.name)
    private readonly WarcraftLogsModel: Model<WarcraftLogs>,
  ) {
    // TODO args for raid, range, & config;
    this.indexWarcraftLogs()
  }

  // TODO cron-task
  async indexWarcraftLogs(): Promise<void> {
    try {
      await this.RealmModel
        .find({ wcl_id: { $ne: null } })
        .cursor({ batchSize: 1 })
        .eachAsync(async (realm: Realm) => {
          const
            pages = range(0, 500, 1),
            config = {
              existing_page: 0,
              exists_log: 0,
              fault_page: 2,
              fault_log: 400
            };

          for (const page of pages) {
            const index_logs = await this.x(
              `https://www.warcraftlogs.com/zone/reports?zone=26&server=${realm.wcl_id}&page=${page}`,
              '.description-cell',
              [
                {
                  link: 'a@href',
                },
              ],
            ).then(res => res);
            /** If parsed page have results */
            if (!index_logs || !index_logs.length) {
              this.logger.log(`ERROR, ${realm.name}, Page: ${page}, Logs not found`);
              // TODO check
              config.existing_page += 1;
              continue
            }
            /**
             * If indexing logs on page have ended
             * and page fault tolerance is more then
             * config, then break for loop
             */
            if (config.existing_page >= config.fault_page) {
              this.logger.log(`BREAK, ${realm.name}, Page: ${page}, Page FT: ${config.fault_page}`);
              break
            }
            // TODO probably to separate function
            const logsBulk: WarcraftLogs[] = [];
            for (const index_log of index_logs) {
              if (!index_log.link) {
                this.logger.log(`ERROR, ${realm.name}, Page: ${page}, Link not found`);
                config.exists_log += 1;
                continue
              }
              if (config.exists_log >= config.fault_log) {
                this.logger.log(`BREAK, ${realm.name}, Log: ${config.exists_log}, Log FT: ${config.fault_log}`);
                break
              }
              const [link]: string[] = index_log.link.match(/(.{16})\s*$/g);
              if (index_log.link.includes('reports')) {
                /*** Check logs in collection */
                let log: WarcraftLogs = await this.WarcraftLogsModel.findById(link);
                if (log) {
                  /** If exists counter +1*/
                  config.exists_log += 1;
                  this.logger.log(`E, Log: ${log._id}, Log EX: ${config.exists_log}`);
                } else {
                  /** Else, counter -1 and create in DB */
                  if (config.exists_log > 1) config.exists_log -= 1;
                  this.logger.log(`C, Log: ${log._id}, Log EX: ${config.exists_log}`)
                  log = new this.WarcraftLogsModel({ _id: link });
                  logsBulk.push(log);
                }
              }
              // TODO safe EX
            }
            await this.WarcraftLogsModel.insertMany(logsBulk, { rawResult: false });
            this.logger.log(`Inserted: ${logsBulk.length} logs`)
          }
        })
    } catch (e) {
      this.logger.error(`${WarcraftlogsService.name},${e}`)
    }
  }
}
