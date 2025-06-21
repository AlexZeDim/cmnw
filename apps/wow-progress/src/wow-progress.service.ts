import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import ms from 'ms';
import * as cheerio from 'cheerio';
import { InjectQueue } from '@nestjs/bullmq';
import { difference, union } from 'lodash';
import { Cron, CronExpression } from '@nestjs/schedule';
import { osintConfig } from '@app/configuration';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersProfileEntity, KeysEntity, RealmsEntity } from '@app/pg';
import { In, Repository } from 'typeorm';
import { pipeline } from 'node:stream/promises';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import {
  CharacterJobQueue,
  charactersQueue,
  delay,
  findRealm,
  getKeys,
  GuildJobQueue,
  guildsQueue,
  ICharacterQueueWP,
  LFG_STATUS,
  OSINT_LFG_WOW_PROGRESS,
  OSINT_SOURCE,
  OSINT_SOURCE_WOW_PROGRESS_RANKS,
  toSlug,
  ProfileJobQueue,
  profileQueue,
  GLOBAL_OSINT_KEY,
  getRandomElement,
} from '@app/resources';

@Injectable()
export class WowProgressService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WowProgressService.name, {
    timestamp: true,
  });

  constructor(
    private httpService: HttpService,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,
    @InjectRepository(CharactersProfileEntity)
    private readonly charactersProfileRepository: Repository<CharactersProfileEntity>,
    @InjectQueue(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
    @InjectQueue(profileQueue.name)
    private readonly queueProfile: Queue<ProfileJobQueue, number>,
    @InjectQueue(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexWowProgress(GLOBAL_OSINT_KEY, osintConfig.isIndexWowProgress);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async indexWowProgress(
    clearance: string = GLOBAL_OSINT_KEY,
    init = true,
  ): Promise<void> {
    try {
      this.logger.warn(`indexWowProgress: init ${init}`);
      if (!init) {
        return;
      }

      const dirPath = path.join(__dirname, '..', '..', 'files', 'wow-progress');
      await fs.ensureDir(dirPath);

      const files = await this.getWowProgress(dirPath);
      await this.unzipWowProgress(clearance, files);

      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.warn(`indexWowProgress: directory ${dirPath} has been removed!`);
    } catch (errorOrException) {
      this.logger.error(
        {
          context: this.indexWowProgress.name,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async getWowProgress(dirPath: string) {
    const response = await this.httpService.axiosRef.get<string>(
      OSINT_SOURCE_WOW_PROGRESS_RANKS,
    );

    const page = cheerio.load(response.data);
    const wpPage = page.html('body > pre:nth-child(3) > a');

    await Promise.allSettled(
      page(wpPage).map(async (x, node) => {
        const isEuGuild = 'attribs' in node && node.attribs.href.includes('eu_');

        if (!isEuGuild) return;

        const url = node.attribs.href;

        const downloadLink = encodeURI(
          decodeURI(OSINT_SOURCE_WOW_PROGRESS_RANKS + url),
        );
        const fileName = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1));
        const realmMatch = fileName.match(/(?<=_)(.*?)(?=_)/g);
        const isMatchExists = realmMatch && realmMatch.length;

        if (!isMatchExists) return;

        const [realmSlug] = realmMatch;

        const realmEntity = await findRealm(this.realmsRepository, realmSlug);

        if (!realmEntity) return;

        const realmGuildsZip = await this.httpService.axiosRef.request({
          url: downloadLink,
          responseType: 'stream',
        });

        const filePath = `${dirPath}/${fileName}`;

        await pipeline(realmGuildsZip.data, fs.createWriteStream(filePath));
      }),
    );

    return await fs.readdir(dirPath);
  }

  private async unzipWowProgress(clearance = GLOBAL_OSINT_KEY, files: string[]) {
    let guildIteration = 0;

    const keysEntities = await getKeys(this.keysRepository, clearance);
    const keysLength = keysEntities.length;
    const dirPath = path.join(__dirname, '..', '..', 'files', 'wow-progress');

    await lastValueFrom(
      from(files).pipe(
        mergeMap(async (file) => {
          try {
            const isNotGzip = !file.match(/gz$/g);
            if (isNotGzip) {
              throw new UnsupportedMediaTypeException(`file ${file} is not gz`);
            }

            const realmMatch = file.match(/(?<=_)(.*?)(?=_)/g);
            const isMatchExists = realmMatch && realmMatch.length;
            if (!isMatchExists) {
              throw new NotFoundException(`file ${file} doesn't have a realm`);
            }

            const [realmSlug] = realmMatch;

            const realmEntity = await findRealm(this.realmsRepository, realmSlug);

            if (!realmEntity) {
              throw new NotFoundException(`realm ${realmSlug} not found!`);
            }

            const buffer = await fs.readFile(`${dirPath}/${file}`);
            const data = zlib
              .unzipSync(buffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
              .toString();

            // @todo interface type
            const json = JSON.parse(data);
            const isJsonValid = json && Array.isArray(json) && json.length;

            if (!isJsonValid) {
              throw new UnsupportedMediaTypeException(`json not valid`);
            }

            for (const guild of json) {
              const isGuildValid = guild.name && !guild.name.includes('[Raid]');
              if (!isGuildValid) {
                this.logger.log(
                  `indexWowProgress: guild ${guild.name} have negative [Raid] pattern, skipping...`,
                );
                continue;
              }

              const guildGuid: string = toSlug(`${guild.name}@${realmEntity.slug}`);

              const { client, secret, token } =
                keysEntities[guildIteration % keysLength];

              await this.queueGuilds.add(
                guildGuid,
                {
                  guid: guildGuid,
                  name: guild.name,
                  realm: realmEntity.slug,
                  createdBy: OSINT_SOURCE.WOW_PROGRESS,
                  updatedBy: OSINT_SOURCE.WOW_PROGRESS,
                  forceUpdate: ms('4h'),
                  region: 'eu',
                  clientId: client,
                  clientSecret: secret,
                  accessToken: token,
                  createOnlyUnique: true,
                  requestGuildRank: true,
                },
                {
                  jobId: guildGuid,
                  priority: 4,
                },
              );

              guildIteration = guildIteration + 1;
            }
          } catch (errorOrException) {
            this.logger.error(
              {
                context: this.unzipWowProgress.name,
                error: JSON.stringify(errorOrException),
              }
            );
          }
        }, 1),
      ),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(clearance: string = GLOBAL_OSINT_KEY): Promise<void> {
    try {
      this.logger.log('————————————————————————————————————');
      /**
       * Revoke characters status from old NOW => to PREV
       */
      await delay(60);
      const charactersLfgRemoveOld = await this.charactersProfileRepository.update(
        {
          lfgStatus: LFG_STATUS.OLD,
        },
        {
          lfgStatus: null,
        },
      );
      this.logger.log(
        `${charactersLfgRemoveOld.affected} characters removed from LFG-${LFG_STATUS.OLD}`,
      );

      const [nowUpdatedResult, newUpdatedResult] = await Promise.all([
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NOW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
        this.charactersProfileRepository.update(
          {
            lfgStatus: LFG_STATUS.NEW,
          },
          {
            lfgStatus: LFG_STATUS.OLD,
          },
        ),
      ]);

      this.logger.debug(
        `characters status revoked from NOW ${nowUpdatedResult.affected} | NEW ${newUpdatedResult.affected}`,
      );

      const keysEntity = await getKeys(this.keysRepository, clearance);
      const [firstPageUrl, secondPageUrl] = OSINT_LFG_WOW_PROGRESS;

      const [firstPage, secondPage] = await Promise.all([
        await this.getWowProgressLfg(firstPageUrl),
        await this.getWowProgressLfg(secondPageUrl),
      ]);

      const isCharacterPageValid = Boolean(firstPage.size && secondPage.size);
      if (!isCharacterPageValid) {
        this.logger.debug(
          `LFG page ${firstPage.size} & ${secondPage.size} | return`,
        );
        return;
      }

      const charactersLfg = new Map([...firstPage, ...secondPage]);
      const charactersLfgNow = union(
        Array.from(firstPage.keys()),
        Array.from(secondPage.keys()),
      );
      /**
       * @description If LFG.OLD not found then write NOW to PREV
       * @description Overwrite LFG status NOW
       */
      this.logger.log(
        `${charactersLfgNow.length} characters found in LFG-${LFG_STATUS.NOW}`,
      );
      const characterProfileLfgOld = await this.charactersProfileRepository.findBy({
        lfgStatus: LFG_STATUS.OLD,
      });
      this.logger.log(
        `${characterProfileLfgOld.length} characters found for LFG-${LFG_STATUS.OLD}`,
      );

      const charactersLfgOld = characterProfileLfgOld.map(
        (character) => character.guid,
      );

      const charactersDiffNew = difference(charactersLfgNow, charactersLfgOld);
      const charactersDiffNow = difference(charactersLfgNow, charactersDiffNew);
      const isLfgNewExists = charactersDiffNew.length;

      await this.charactersProfileRepository.update(
        {
          guid: In(charactersDiffNow),
        },
        {
          lfgStatus: LFG_STATUS.NOW,
        },
      );

      this.logger.log(
        `${isLfgNewExists} characters added to queue with LFG-${LFG_STATUS.NOW}`,
      );

      if (!isLfgNewExists) return;

      const realmsEntity = new Map<string, RealmsEntity>([]);

      const isLfgOldExists = Boolean(characterProfileLfgOld.length);

      const lookingForGuild = isLfgOldExists ? LFG_STATUS.NEW : LFG_STATUS.NOW;

      await lastValueFrom(
        from(charactersDiffNew).pipe(
          mergeMap(async (characterGuid) =>
            this.pushCharacterAndProfileToQueue(
              characterGuid,
              charactersLfg,
              realmsEntity,
              keysEntity,
              lookingForGuild
            )
          ),
        ),
      );
      this.logger.log('————————————————————————————————————');
    } catch (errorOrException) {
      this.logger.error(
        {
          context: this.indexWowProgressLfg.name,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async pushCharacterAndProfileToQueue(
    characterGuid: string,
    charactersLfg: Map<string, ICharacterQueueWP>,
    realmsEntity: Map<string, RealmsEntity>,
    keysEntity: KeysEntity[],
    lookingForGuild: LFG_STATUS
  ): Promise<void> {
    try {
      const characterQueue = charactersLfg.get(characterGuid);
      const isRealmInStore = realmsEntity.has(characterQueue.realm);

      const realmEntity = isRealmInStore
        ? realmsEntity.get(characterQueue.realm)
        : await findRealm(this.realmsRepository, characterQueue.realm);

      if (!realmEntity) {
        this.logger.warn(`Realm: ${characterQueue.realm} not found`);
        return;
      }

      if (!isRealmInStore) realmsEntity.set(characterQueue.realm, realmEntity);

      const key = getRandomElement(keysEntity);

      await Promise.allSettled([
        this.queueProfile.add(characterQueue.guid, {
          guid: characterQueue.guid,
          name: characterQueue.name,
          realm: realmEntity.slug,
          lookingForGuild,
          updateRIO: true,
          updateWCL: true,
          updateWP: true,
        }),
        await this.queueCharacters.add(
          characterQueue.guid,
          {
            guid: characterQueue.guid,
            name: characterQueue.name,
            realm: realmEntity.slug,
            realmId: realmEntity.id,
            realmName: realmEntity.name,
            region: 'eu',
            clientId: key.client,
            clientSecret: key.secret,
            accessToken: key.token,
            createdBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
            updatedBy: OSINT_SOURCE.WOW_PROGRESS_LFG,
            requestGuildRank: false,
            createOnlyUnique: false,
            forceUpdate: 1000 * 60 * 30,
          },
          {
            jobId: characterQueue.guid,
            priority: 2,
          },
        ),
      ]);

      this.logger.log(
        `pushCharacterAndProfileToQueue: Added to character queue: ${characterQueue.guid}`,
      );
    } catch (errorOrException) {
      this.logger.error(
        {
          context: this.pushCharacterAndProfileToQueue.name,
          error: JSON.stringify(errorOrException),
        }
      );
    }
  }

  private async getWowProgressLfg(url: string) {
    const wpCharactersQueue = new Map<string, ICharacterQueueWP>([]);
    try {
      const response = await this.httpService.axiosRef.get(url);

      const wowProgressHTML = cheerio.load(response.data);
      const listingLookingForGuild = wowProgressHTML.html('table.rating tbody tr');

      await Promise.allSettled(
        wowProgressHTML(listingLookingForGuild).map(async (x, node) => {
          const tableRowElement = wowProgressHTML(node).find('td');
          const [preName, preGuild, preRaid, preRealm, preItemLevel, preTimestamp] =
            tableRowElement;

          const name = wowProgressHTML(preName).text().trim();
          const guild = wowProgressHTML(preGuild).text();
          const raid = wowProgressHTML(preRaid).text();
          const [, rawRealm] = wowProgressHTML(preRealm).text().split('-');
          const itemLevel = wowProgressHTML(preItemLevel).text();
          const timestamp = wowProgressHTML(preTimestamp).text();

          const realm = rawRealm.trim();
          const isCharacterValid = Boolean(name && realm);
          if (!isCharacterValid) return;

          const guid = toSlug(`${name}@${realm}`);

          wpCharactersQueue.set(guid, {
            guid,
            name,
            guild,
            raid,
            realm,
            itemLevel,
            timestamp,
          });
        }),
      );

      return wpCharactersQueue;
    } catch (errorOrException) {
      this.logger.error(
        {
          context: this.getWowProgressLfg.name,
          error: JSON.stringify(errorOrException),
        }
      );
      return wpCharactersQueue;
    }
  }
}
