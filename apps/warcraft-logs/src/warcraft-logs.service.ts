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
  GLOBAL_OSINT_KEY,
  randomInt,
  getKey,
  getKeys,
  isCharacterRaidLogResponse,
  RaidCharacter,
  toGuid,
} from '@app/core';

import { Cron, CronExpression } from '@nestjs/schedule';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { delay } from '@app/core';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom } from 'rxjs';
import { RealmsEntity, CharactersRaidLogsEntity, KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import cheerio from 'cheerio';
import { get } from 'lodash';
import { mergeMap } from 'rxjs/operators';

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
    await this.indexLogs();
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
  async indexLogs(): Promise<void> {
    try {
      await delay(30);
      const key = await getKey(this.keysRepository, 'v2');
      if (key) {
        throw new NotFoundException(
          `Clearance ${GLOBAL_WCL_KEY} keys have been found`,
        );
      }

      const characterRaidLog = await this.charactersRaidLogsRepository.findBy({
        isIndexed: false,
        // TODO page and offset remember cursor
      });

      await lastValueFrom(
        from(characterRaidLog).pipe(
          mergeMap(async (characterRaidLogEntity) => {
            const raidCharacters = await this.getCharactersFromLogs(
              key.token,
              characterRaidLogEntity.logId,
            );

            await this.charactersRaidLogsRepository.update(
              { logId: characterRaidLogEntity.logId },
              { isIndexed: true },
            );

            this.logger.log(`Log: ${characterRaidLogEntity.logId}`);

            await this.charactersToQueue(raidCharacters);
          }, 5),
        ),
      );
    } catch (errorOrException) {
      this.logger.error(`indexLogs: ${errorOrException}`);
    }
  }

  async getCharactersFromLogs(token: string, logId: string) {
    const response = await this.httpService.axiosRef.request({
      method: 'post',
      url: 'https://www.warcraftlogs.com/api/v2/client',
      headers: { Authorization: `Bearer ${token}` },
      data: {
        query: `
          query {
            reportData {
              report (code: "${logId}") {
                startTime
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
    });
    const isGuard = isCharacterRaidLogResponse(response);
    if (!isGuard) return [];
    /**
     * @description Take both characters ranked & playable
     */
    const timestamp = get(response, 'data.data.reportData.report.startTime', 1);
    const rankedCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.rankedCharacters',
      [],
    ).map((character) => ({
      guid: toGuid(character.name, character.server.slug),
      id: character.id,
      name: character.name,
      realmName: character.server.name,
      realm: character.server.slug,
      guildRank: character.guildRank,
      timestamp: timestamp,
    }));

    const playableCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.masterData.actors',
      [],
    )
      .filter((character) => character.type === 'Player')
      .map((character) => ({
        guid: toGuid(character.name, character.server),
        name: character.name,
        realmName: character.server,
        timestamp: timestamp,
      }));

    const raidCharacters = [...rankedCharacters, ...playableCharacters];
    const characters = new Map<string, RaidCharacter>();

    for (const character of raidCharacters) {
      const isIn = characters.has(character.guid);
      if (isIn) continue;
      characters.set(character.guid, character);
    }

    return Array.from(characters.values());
  }

  async charactersToQueue(raidCharacters: Array<RaidCharacter>): Promise<boolean> {
    try {
      let itx = 0;
      const keys = await getKeys(this.keysRepository, GLOBAL_OSINT_KEY, true);
      if (!keys.length) {
        throw new NotFoundException(`Clearance ${GLOBAL_OSINT_KEY} have been found`);
      }

      const charactersToJobs = raidCharacters.map((raidCharacter) => {
        itx++;
        if (itx >= keys.length) itx = 0;

        return {
          name: raidCharacter.guid,
          data: {
            guid: raidCharacter.guid,
            name: raidCharacter.name,
            realm: raidCharacter.realm,
            updatedAt: raidCharacter.timestamp,
            createdBy: OSINT_SOURCE.WARCRAFT_LOGS,
            updatedBy: OSINT_SOURCE.WARCRAFT_LOGS,
            region: 'eu',
            clientId: keys[itx].client,
            clientSecret: keys[itx].secret,
            accessToken: keys[itx].token,
            guildRank: false,
            createOnlyUnique: true,
            forceUpdate: 0,
          },
          opts: {
            jobId: raidCharacter.guid,
            priority: 2,
          },
        };
      });

      await this.queue.addBulk(charactersToJobs);
      this.logger.log(
        `addCharacterToQueue | ${charactersToJobs.length} characters to characterQueue`,
      );
      return true;
    } catch (errorOrException) {
      this.logger.error(`addCharacterToQueue: ${errorOrException}`);
      return false;
    }
  }
}
