import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  GLOBAL_WCL_KEY,
  charactersQueue,
  IWarcraftLogsConfig,
  OSINT_SOURCE,
  toSlug,
  GLOBAL_OSINT_KEY,
  IWarcraftLogsActors,
  randomInt,
  getKey, getKeys
} from "@app/core";

import { Cron, CronExpression } from '@nestjs/schedule';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { delay } from '@app/core';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { RealmsEntity, CharactersRaidLogsEntity, KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import cheerio from 'cheerio';

@Injectable()
export class WarcraftLogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WarcraftLogsService.name, {
    timestamp: true,
  });

  constructor(
    private httpService: HttpService,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @BullQueueInject(charactersQueue.name)
    private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexLogs(GLOBAL_OSINT_KEY);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(): Promise<void> {
    try {
      const realmsEntities = await this.realmsRepository.findBy({
        warcraftLogsId: Not(IsNull()),
      });

      for (const realmEntity of realmsEntities) {
        await this.indexCharacterRaidLogs(warcraftLogsConfig, realmEntity);
      }
    } catch (errorOrException) {
      this.logger.error(`${WarcraftLogsService.name},${errorOrException}`);
    }
  }

  async getLogsFromPage(
    config: IWarcraftLogsConfig,
    realmId = 1,
    page = 1,
  ): Promise<Array<string>> {
    try {
      const warcraftLogsURI = 'https://www.warcraftlogs.com/zone/reports';

      const response = await this.httpService.axiosRef.get(
        `${warcraftLogsURI}?zone=${config.raidTier}&server=${realmId}&page=${page}`,
      );

      const wclHTML = cheerio.load(response.data);
      const wclLogsUnique = new Set<string>();
      const wclTable = wclHTML.html('td.description-cell > a');

      wclHTML(wclTable).each((_x, node) => {
        const hrefString = wclHTML(node).attr('href');
        const isReports = hrefString.includes('reports');
        if (isReports) {
          const [link]: string[] = hrefString.match(/(.{16})\s*$/g);
          wclLogsUnique.add(link);
        }
      });

      return Array.from(wclLogsUnique);
    } catch (errorOrException) {
      this.logger.error(`getLogsFromPage: ${errorOrException}`);
    }
  }

  async indexCharacterRaidLogs(
    wclConfig: IWarcraftLogsConfig,
    realmEntity: RealmsEntity,
  ): Promise<void> {
    try {
      let logsAlreadyExists = 0;

      for (let page = wclConfig.from; page < wclConfig.to; page++) {
        const random = randomInt(1, 5);
        await delay(random);

        const wclLogsFromPage = await this.getLogsFromPage(
          wclConfig,
          realmEntity.warcraftLogsId,
          page,
        );
        /**
         * If indexing logs on page have ended
         * and page fault tolerance is more than
         * config, then break for loop
         */
        const [isPageEmpty, isPageMoreThen, isLogsMoreThen] = [
          !wclLogsFromPage.length,
          page > wclConfig.page,
          logsAlreadyExists > wclConfig.logs,
        ];

        if (isPageMoreThen) {
          this.logger.log(
            `BREAK | ${realmEntity.name} | Page: ${page} > ${wclConfig.page}`,
          );
          break;
        }

        if (isLogsMoreThen) {
          this.logger.log(
            `BREAK | ${realmEntity.name} | Logs: ${logsAlreadyExists} > ${wclConfig.logs}`,
          );
          break;
        }

        /** If parsed page have no results */
        if (isPageEmpty) {
          this.logger.log(
            `ERROR | ${realmEntity.name} | Page: ${page} | Logs not found`,
          );
          continue;
        }

        for (const logId of wclLogsFromPage) {
          const characterRaidLog = await this.charactersRaidLogsRepository.exist({
            where: { logId },
          });

          if (!characterRaidLog) {
            await this.charactersRaidLogsRepository.save({
              logId,
            });
            this.logger.log(
              `CREATED | Log: ${logId} | Log EX: ${logsAlreadyExists}`,
            );

            if (logsAlreadyExists > 1) logsAlreadyExists -= 1;
          }
          /** If exists counter +1*/
          if (characterRaidLog) {
            logsAlreadyExists += 1;
            // this.logger.warn(`E, Log: ${logId}, Log EX: ${logsAlreadyExists}`);
          }
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
      const key = await getKey(this.keysRepository, 'v2');
      if (key) {
        throw new NotFoundException(
          `Clearance ${GLOBAL_WCL_KEY} keys have been found`,
        );
      }

      const keys = await getKeys(this.keysRepository, clearance, true);
      if (!keys.length) {
        throw new NotFoundException(`Clearance ${clearance} have been found`);
      }

      let itx = 0;

      const characterRaidLog = await this.charactersRaidLogsRepository.findBy({
        status: false,
        // TODO page and offset
      });

      await this.WarcraftLogsModel.find({ status: false })
        .cursor({ batchSize: 1 })
        .eachAsync(async (log) => {
          try {
            const response = await lastValueFrom(
              this.httpService.request({
                method: 'post',
                url: 'https://www.warcraftlogs.com/api/v2/client',
                headers: { Authorization: `Bearer ${keysWCL[itx].token}` },
                data: {
                  query: `
                    query {
                      reportData {
                        report (code: ${}) {
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

            itx++;
            if (itx >= keysWCL.length) itx = 0;

            if (!!response?.data?.data?.reportData?.report) {
              const warcraftLog = response?.data?.data?.reportData?.report;

              if (warcraftLog.masterData?.actors) {
                const actors: IWarcraftLogsActors[] = warcraftLog.masterData?.actors;
                const players = actors.filter((actor) => actor.type === 'Player');
                if (players.length) {
                  const result = await this.charactersToQueue(players, keys);
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

  async charactersToQueue(
    exportedCharacters: IWarcraftLogsActors[],
    keys: Key[],
  ): Promise<boolean> {
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
      this.logger.log(
        `addCharacterToQueue, add ${charactersToJobs.length} characters to characterQueue`,
      );
      return true;
    } catch (errorOrException) {
      this.logger.error(`addCharacterToQueue: ${errorOrException}`);
      return false;
    }
  }
}
