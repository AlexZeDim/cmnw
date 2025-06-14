import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  GLOBAL_WCL_KEY_V2,
  charactersQueue,
  OSINT_SOURCE,
  GLOBAL_OSINT_KEY,
  randomInt,
  getKey,
  getKeys,
  isCharacterRaidLogResponse,
  RaidCharacter,
  toGuid,
  KEY_LOCK,
  CharacterJobQueue,
} from '@app/resources';

import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { delay } from '@app/resources';
import { RegionIdOrName } from 'blizzapi';
import { warcraftLogsConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import { from, lastValueFrom } from 'rxjs';
import { RealmsEntity, CharactersRaidLogsEntity, KeysEntity } from '@app/pg';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { get } from 'lodash';
import { mergeMap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { InjectRedis } from '@nestjs-modules/ioredis';
import * as cheerio from 'cheerio';
import Redis from 'ioredis';
import ms from 'ms';
import * as changeCase from 'change-case';


@Injectable()
export class WarcraftLogsService implements OnApplicationBootstrap {
  private config = warcraftLogsConfig;
  private readonly logger = new Logger(WarcraftLogsService.name, {
    timestamp: true,
  });

  constructor(
    private httpService: HttpService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(CharactersRaidLogsEntity)
    private readonly charactersRaidLogsRepository: Repository<CharactersRaidLogsEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectQueue(charactersQueue.name)
    private readonly characterQueue: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexLogs();
    await this.indexWarcraftLogs();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async indexWarcraftLogs(): Promise<void> {
    try {
      const lock = Boolean(await this.redisService.exists(KEY_LOCK.WARCRAFT_LOGS));
      if (lock) {
        this.logger.warn(`indexWarcraftLogs is already running`);
        return;
      }

      await this.redisService.set(KEY_LOCK.WARCRAFT_LOGS, '1', 'EX', 60 * 60 * 23);

      const realmsEntities = await this.realmsRepository.findBy({
        warcraftLogsId: Not(IsNull()),
      });

      for (const realmEntity of realmsEntities) {
        await this.indexCharacterRaidLogs(realmEntity);
      }

    } catch (errorOrException) {
      this.logger.error(
        {
          context: WarcraftLogsService.name,
          error: JSON.stringify(errorOrException),
        }
      );
    } finally {
      await this.redisService.del(KEY_LOCK.WARCRAFT_LOGS);
    }
  }

  async getLogsFromPage(realmId = 1, page = 1) {
    try {
      const warcraftLogsURI = 'https://www.warcraftlogs.com/zone/reports';
      // --- add if necessary @todo zone=${this.config.raidTier}& --- //
      const params = `server=${realmId}&`;

      const response = await this.httpService.axiosRef.get<string>(
        `${warcraftLogsURI}?${params}page=${page}`,
      );

      const wclHTML = cheerio.load(response.data);
      const wclTable = wclHTML.html('tbody > tr');
      const warcraftLogsMap = new Map<
        string,
        Pick<CharactersRaidLogsEntity, 'logId' | 'createdAt'>
      >();

      wclHTML(wclTable).each((itx, element) => {
        const momentFormat = wclHTML(element)
          .children()
          .find('td > span.moment-format')
          .attr('data-timestamp');
        const hrefString = wclHTML(element)
          .children()
          .find('td.description-cell > a')
          .attr('href');

        const isReports = hrefString.includes('reports');
        if (isReports && momentFormat) {
          const [logId] = hrefString.match(/(.{16})\s*$/g);
          const createdAt = DateTime.fromSeconds(Number(momentFormat)).toJSDate();
          warcraftLogsMap.set(logId, { logId, createdAt });
        }
      });

      return Array.from(warcraftLogsMap.values());
    } catch (errorOrException) {
      this.logger.error(
        {
          context: 'getLogsFromPage',
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  async indexCharacterRaidLogs(realmEntity: RealmsEntity): Promise<void> {
    try {
      let logsAlreadyExists = 0;

      for (let page = this.config.fromPage; page < this.config.toPage; page++) {
        const random = randomInt(1, 5);
        await delay(random);

        const wclLogsFromPage = await this.getLogsFromPage(
          realmEntity.warcraftLogsId,
          page,
        );
        /**
         * If indexing logs on the page have ended and page fault
         * tolerance is more than config, then break for loop
         */
        const [isPageEmpty, isLogsMoreThen] = [
          !wclLogsFromPage.length,
          logsAlreadyExists > this.config.logs,
        ];

        if (isLogsMoreThen) {
          this.logger.log(
            `BREAK | ${realmEntity.name} | Logs: ${logsAlreadyExists} > ${this.config.logs}`,
          );
          break;
        }

        // --- If parsed page have no results --- //
        if (isPageEmpty) {
          this.logger.log(
            `ERROR | ${realmEntity.name} | Page: ${page} | Logs not found`,
          );
          break;
        }

        for (const { logId, createdAt } of wclLogsFromPage) {
          const characterRaidLog = await this.charactersRaidLogsRepository.exist({
            where: { logId },
          });
          // --- If exists counter --- //
          if (characterRaidLog) {
            logsAlreadyExists += 1;
            this.logger.log(
              `EXISTS | ID: ${logId} | R: ${realmEntity.name} | Log EX: ${logsAlreadyExists}`,
            );
            continue;
          }

          if (!characterRaidLog) {
            await this.charactersRaidLogsRepository.save({
              logId,
              isIndexed: false,
              createdAt,
            });
            this.logger.log(
              `CREATED | ID: ${logId} | R: ${realmEntity.name} | Log EX: ${logsAlreadyExists}`,
            );

            if (logsAlreadyExists > 1) logsAlreadyExists -= 1;
          }
        }
      }
    } catch (errorOrException) {
      this.logger.error(
        {
          context: 'indexCharacterRaidLogs',
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async indexLogs(): Promise<void> {
    try {
      const isJobLocked = Boolean(await this.redisService.exists(GLOBAL_WCL_KEY_V2));
      if (isJobLocked) {
        this.logger.warn(`indexLogs is already running`);
        return;
      }

      await this.redisService.set(GLOBAL_WCL_KEY_V2, '1', 'EX', 60 * 59);

      await delay(10);
      const wclKey = await getKey(this.keysRepository, GLOBAL_WCL_KEY_V2);
      // --- A bit skeptical about taking the interval required semaphore --- //
      const characterRaidLog = await this.charactersRaidLogsRepository.find({
        where: { isIndexed: false },
        take: 5_000,
      });

      if (!characterRaidLog.length) {
        this.logger.warn(`No logs to index`);
        return;
      }

      await lastValueFrom(
        from(characterRaidLog).pipe(
          mergeMap((characterRaidLogEntity) =>
            this.indexLogAndPushCharactersToQueue(characterRaidLogEntity, wclKey), 5),
        ),
      );

      this.logger.log(`indexLogs: character raid logs | ${characterRaidLog.length}`);
    } catch (errorOrException) {
      this.logger.error(
        {
          context: 'indexLogs',
          error: JSON.stringify(errorOrException),
        }
      );
    } finally {
      await this.redisService.del(GLOBAL_WCL_KEY_V2);
    }
  }

  async indexLogAndPushCharactersToQueue(characterRaidLogEntity: CharactersRaidLogsEntity, wclKey: KeysEntity) {
    try {
      const raidCharacters = await this.getCharactersFromLogs(
        wclKey.token,
        characterRaidLogEntity.logId,
      );

      await this.charactersRaidLogsRepository.update(
        { logId: characterRaidLogEntity.logId },
        { isIndexed: true },
      );

      this.logger.log(`Log: ${characterRaidLogEntity.logId} | indexed: isIndexed: true`);

      await this.charactersToQueue(raidCharacters);
    } catch (errorOrException) {
      this.logger.error(
        {
          context: 'indexLogAndPushCharactersToQueue',
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  async getCharactersFromLogs(token: string, logId: string) {
    const response = await this.httpService.axiosRef.request<unknown, unknown>({
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

    // --- Take both characters ranked & playable --- //
    const timestamp = get(response, 'data.data.reportData.report.startTime', 1);
    const rankedCharacters: Array<RaidCharacter> = get(
      response,
      'data.data.reportData.report.rankedCharacters',
      [],
    ).map((character) => ({
      guid: toGuid(character.name, character.server.slug),
      id: character.id,
      name: character.name,
      realm: changeCase.kebabCase(character.server.slug),
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
        guid: changeCase.kebabCase(`${character.name}@${character.server}`),
        name: character.name,
        realm: changeCase.kebabCase(character.server),
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
      const keys = await getKeys(this.keysRepository, GLOBAL_OSINT_KEY, false);

      const charactersToJobs = raidCharacters.map((raidCharacter) => {
        itx++;
        if (itx >= keys.length) itx = 0;

        return {
          name: raidCharacter.guid,
          data: {
            guid: raidCharacter.guid,
            name: raidCharacter.name,
            realm: raidCharacter.realm,
            updatedAt: new Date(raidCharacter.timestamp),
            createdBy: OSINT_SOURCE.WARCRAFT_LOGS,
            updatedBy: OSINT_SOURCE.WARCRAFT_LOGS,
            region: <RegionIdOrName>'eu',
            clientId: keys[itx].client,
            clientSecret: keys[itx].secret,
            accessToken: keys[itx].token,
            forceUpdate: ms('1m'),
            requestGuildRank: false,
            createOnlyUnique: false,
          },
          opts: {
            jobId: raidCharacter.guid,
            priority: 2,
          },
        };
      });

      await this.characterQueue.addBulk(charactersToJobs);
      this.logger.log(
        `addCharacterToQueue | ${charactersToJobs.length} characters to characterQueue`,
      );
      return true;
    } catch (errorOrException) {
      this.logger.error(
        {
          context: 'addCharacterToQueue',
          error: JSON.stringify(errorOrException),
        }
      );
      return false;
    }
  }
}
