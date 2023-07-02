import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm, WarcraftLogs } from '@app/mongo';
import { Model } from 'mongoose';
import {
  GLOBAL_WCL_KEY,
  charactersQueue,
  IWarcraftLogsConfig,
  OSINT_SOURCE,
  toSlug,
  GLOBAL_OSINT_KEY,
  IWarcraftLogsActors, randomInt,
} from '@app/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { delay } from '@app/core/utils/converters';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import cheerio from 'cheerio';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WarcraftlogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    WarcraftlogsService.name, { timestamp: true },
  );

  constructor(
    private httpService: HttpService,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(WarcraftLogs.name)
    private readonly WarcraftLogsModel: Model<WarcraftLogs>,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexLogs(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(): Promise<void> {
    try {
      await this.RealmModel
        .find({ wcl_id: { $ne: null } })
        .cursor({ batchSize: 1 })
        .eachAsync(async (realm: Realm) => {
          await this.indexPage(warcraftLogsConfig, realm);
        });
    } catch (errorOrException) {
      this.logger.error(`${WarcraftlogsService.name},${errorOrException}`);
    }
  }

  async indexPage(config: IWarcraftLogsConfig, realm: Realm): Promise<void> {
    try {
      let logExists = 0;
      for (let page = config.from; page < config.to; page++) {
        const random = randomInt(1, 5);
        await delay(random);

        const response = await lastValueFrom(
          this.httpService.get(`https://www.warcraftlogs.com/zone/reports?zone=${config.raid_tier}&server=${realm.wcl_id}&page=${page}`),
        );

        const wclHTML = cheerio.load(response.data);
        const wclLogsSet = new Set<string>();
        const wclTable = wclHTML
          .html('td.description-cell > a');

        wclHTML(wclTable)
          .each((_x, node) => {
            const hrefString = wclHTML(node).attr('href');
            if (hrefString.includes('reports')) {
              const [link]: string[] = hrefString.match(/(.{16})\s*$/g);
              wclLogsSet.add(link);
            }
          });

        /**
         * If indexing logs on page have ended
         * and page fault tolerance is more then
         * config, then break for loop
         */
        if (page > config.page) {
          this.logger.log(`BREAK, ${realm.name}, Page: ${page}, Page FT: ${page} > ${config.page}`);
          break;
        }

        /** If parsed page have no results */
        if (!!wclTable || !wclLogsSet.size) {
          this.logger.log(`ERROR, ${realm.name}, Page: ${page}, Logs not found`);
          continue;
        }

        for (const logId of wclLogsSet.values()) {
          if (logExists > config.logs) {
            this.logger.log(`BREAK, ${realm.name}, Log FT: ${logExists} > ${config.logs}`);
            break;
          }

          const log: WarcraftLogs = await this.WarcraftLogsModel.findById(logId);
          if (log) {
            /** If exists counter +1*/
            logExists += 1;
            wclLogsSet.delete(logId);
            this.logger.warn(`E, Log: ${log._id}, Log EX: ${logExists}`);
          } else {
            /** Else, counter -1 and create in DB */
            if (logExists > 1) logExists -= 1;
            this.logger.log(`C, Log: ${logId}, Log EX: ${logExists}`);
            await this.WarcraftLogsModel.create({ _id: logId });
          }
        }

        if (logExists > config.logs) {
          this.logger.log(`BREAK, ${realm.name}, Log FT: ${logExists} > ${config.logs}`);
          break;
        }
      }
    } catch (errorOrException) {
      this.logger.error(`indexLogs: ${errorOrException}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async indexLogs(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      await delay(30);
      const keysWCL = await this.KeyModel.find({ tags: { $in: [GLOBAL_WCL_KEY, 'v2'] } });
      if (!keysWCL.length) {
        throw new NotFoundException(`clearance ${GLOBAL_WCL_KEY} ${keysWCL.length} keys have been found`);
      }

      const keysBnet = await this.KeyModel.find({ tags: clearance });
      if (!keysBnet.length) {
        throw new NotFoundException(`clearance ${clearance} ${keysBnet.length} have been found`);
      }

      let i: number = 0;

      await this.WarcraftLogsModel
        .find({ status: false })
        .cursor({ batchSize: 1 })
        .eachAsync(async (log) => {
          try {
            const response = await lastValueFrom(
              this.httpService.request({
                method: 'post',
                url: 'https://www.warcraftlogs.com/api/v2/client',
                headers: { Authorization: `Bearer ${keysWCL[i].token}` },
                data: {
                  query: `
                    query {
                      reportData {
                        report (code: "QJxpjgL7ZnvVkFzT") {
                          rankedCharacters {
                            id
                            name
                            guildRank
                            server {
                              id
                              name
                              normalizedName
                              slug
                            }
                          }
                          masterData {
                            actors {
                              type
                              name
                              server
                            }
                          }
                        }
                      }
                    }`,
                },
              }),
            );

            i++;
            if (i >= keysWCL.length) i = 0;

            if (!!response?.data?.data?.reportData?.report) {
              const warcraftLog = response?.data?.data?.reportData?.report;

              if (warcraftLog.masterData?.actors) {
                const actors: IWarcraftLogsActors[] = warcraftLog.masterData?.actors;
                const players = actors.filter(actor => actor.type === 'Player');
                if (players.length) {
                  const result = await this.charactersToQueue(players, keysBnet);
                  if (result) {
                    log.status = true;
                    await log.save();
                  }
                }
              }
            }

            this.logger.log(`Log: ${log._id}, status: ${log.status}`);
          } catch (errorOrException) {
            this.logger.error(`Log: ${log._id}, ${errorOrException}`);
          }
        });
    } catch (errorOrException) {
      this.logger.error(`indexLogs: ${errorOrException}`);
    }
  }

  async charactersToQueue(exportedCharacters: IWarcraftLogsActors[], keys: Key[]): Promise<boolean> {
    try {
      let iteration = 0;

      const charactersToJobs = exportedCharacters.map((character) => {
        const _id = toSlug(`${character.name}@${character.server}`);

        iteration++;
        if (iteration >= keys.length) iteration = 0;

        return {
          name: _id,
          data: {
            _id: _id,
            name: character.name,
            realm: character.server,
            updatedAt: new Date(),
            created_by: OSINT_SOURCE.WARCRAFT_LOGS,
            updated_by: OSINT_SOURCE.WARCRAFT_LOGS,
            region: 'eu',
            clientId: keys[iteration]._id,
            clientSecret: keys[iteration].secret,
            accessToken: keys[iteration].token,
            guildRank: false,
            createOnlyUnique: true,
            forceUpdate: 0,
          },
          opts: {
            jobId: _id,
            priority: 4,
          },
        };
      });

      await this.queue.addBulk(charactersToJobs);
      this.logger.log(`addCharacterToQueue, add ${charactersToJobs.length} characters to characterQueue`);
      return true;
    } catch (errorOrException) {
      this.logger.error(`addCharacterToQueue: ${errorOrException}`);
      return false;
    }
  }
}
