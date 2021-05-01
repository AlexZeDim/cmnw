import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm, WarcraftLogs } from '@app/mongo';
import { Model } from "mongoose";
import { range } from 'lodash';
import Xray from 'x-ray';
import {
  ExportedCharactersInterface,
  GLOBAL_WCL_KEY,
  charactersQueue,
  WarcraftLogsConfigInterface,
  OSINT_SOURCE,
  toSlug,
  GLOBAL_OSINT_KEY,
} from '@app/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { delay } from '@app/core/utils/converters';

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
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue,
  ) {
    // TODO config args?
    this.indexWarcraftLogs({ raid_tier: 26, pages_from: 0, pages_to: 500, page: 2, logs: 500 });
    this.indexLogs(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(config: WarcraftLogsConfigInterface = { raid_tier: 26, pages_from: 0, pages_to: 500, page: 2, logs: 500 }): Promise<void> {
    try {
      await this.RealmModel
        .find({ wcl_id: { $ne: null } })
        .cursor({ batchSize: 1 })
        .eachAsync(async (realm: Realm) => {
          const pages = range(0, 500, 1);
          let ex_page = 0;
          let ex_logs = 0;

          for (const page of pages) {
            await delay(5);
            const index_logs = await this.x(
              `https://www.warcraftlogs.com/zone/reports?zone=${config.raid_tier}&server=${realm.wcl_id}&page=${page}`,
              '.description-cell',
              [
                {
                  link: 'a@href',
                },
              ],
            ).then(res => res);
            /**
             * If indexing logs on page have ended
             * and page fault tolerance is more then
             * config, then break for loop
             */
            if (ex_page > config.page) {
              this.logger.log(`BREAK, ${realm.name}, Page: ${page}, Page FT: ${ex_page} > ${config.page}`);
              break
            }
            /** If parsed page have results */
            if (!index_logs || !index_logs.length) {
              this.logger.log(`ERROR, ${realm.name}, Page: ${page}, Logs not found`);
              ex_page += 1;
              continue
            }
            // TODO probably to separate function
            const logsBulk: WarcraftLogs[] = [];
            for (const index_log of index_logs) {
              if (ex_logs > config.logs) {
                this.logger.log(`BREAK, ${realm.name}, Log FT: ${ex_logs} > ${config.logs}`);
                break
              }
              if (!index_log.link) {
                this.logger.log(`ERROR, ${realm.name}, Page: ${page}, Link not found`);
                ex_logs += 1;
                continue
              }
              const [link]: string[] = index_log.link.match(/(.{16})\s*$/g);
              if (index_log.link.includes('reports')) {
                /*** Check logs in collection */
                let log: WarcraftLogs = await this.WarcraftLogsModel.findById(link);
                if (log) {
                  /** If exists counter +1*/
                  ex_logs += 1;
                  this.logger.log(`E, Log: ${log._id}, Log EX: ${ex_logs}`);
                } else {
                  /** Else, counter -1 and create in DB */
                  if (ex_logs > 1) ex_logs -= 1;
                  this.logger.log(`C, Log: ${link}, Log EX: ${ex_logs}`)
                  log = new this.WarcraftLogsModel({ _id: link });
                  logsBulk.push(log);
                }
              }
            }
            await this.WarcraftLogsModel.insertMany(logsBulk, { rawResult: false });
            this.logger.log(`Inserted: ${logsBulk.length} logs`);
            if (ex_logs > config.logs) {
              this.logger.log(`BREAK, ${realm.name}, Log FT: ${ex_logs} > ${config.logs}`);
              break
            }
          }
        })
    } catch (e) {
      this.logger.error(`${WarcraftlogsService.name},${e}`)
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async indexLogs(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      await delay(30);
      const [ warcraft_logs_key, keys ] = await Promise.all([
        await this.KeyModel.findOne({ tags: GLOBAL_WCL_KEY }),
        await this.KeyModel.find({ tags: clearance })
      ])
      if (!warcraft_logs_key || !warcraft_logs_key.token) {
        this.logger.error(`indexLogs: clearance: WCL key not found`);
        return;
      }
      if (!keys.length) {
        this.logger.error(`indexLogs: clearance ${clearance} ${keys.length} have been found`);
        return;
      }
      await this.WarcraftLogsModel
        .find({ status: false })
        .cursor({ batchSize: 1 })
        .eachAsync(async (log: WarcraftLogs) => {
          const { exportedCharacters }: { exportedCharacters: ExportedCharactersInterface[] } = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${log._id}?api_key=${warcraft_logs_key.token}`)
            .then(res => res.data || { exportedCharacters: [] });
          const result = await this.exportedCharactersToQueue(exportedCharacters, keys);
          if (result) {
            log.status = true;
            await log.save();
          }
          this.logger.log(`Log: ${log._id}, status: ${log.status}`);
        })
    } catch (e) {
      this.logger.error(`indexLogs: ${e}`);
    }
  }

  async exportedCharactersToQueue(exportedCharacters: ExportedCharactersInterface[], keys: Key[]): Promise<boolean | undefined> {
    try {
      let iteration = 0;
      const charactersToJobs = exportedCharacters.map((character) => {
        const _id: string = toSlug(`${character.name}@${character.server}`);
        iteration++
        if (iteration >= keys.length) iteration = 0;
        return {
          name: _id,
          data: {
            _id: _id,
            name: character.name,
            realm: character.server,
            updatedAt: new Date(),
            created_by: OSINT_SOURCE.WARCRAFTLOGS,
            updated_by: OSINT_SOURCE.WARCRAFTLOGS,
            region: 'eu',
            clientId: keys[iteration]._id,
            clientSecret: keys[iteration].secret,
            accessToken: keys[iteration].token,
            guildRank: false,
            createOnlyUnique: true,
            forceUpdate: false,
          },
          options: {
            jobId: _id,
            priority: 4,
          },
        }
      });
      await this.queue.addBulk(charactersToJobs);
      this.logger.log(`addCharacterToQueue, add ${charactersToJobs.length} characters to characterQueue`);
      return true;
    } catch (e) {
      this.logger.error(`addCharacterToQueue: ${e}`);
    }
  }
}
