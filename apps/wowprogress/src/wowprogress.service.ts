import { InjectModel } from '@nestjs/mongoose';
import { Character, Key, Realm } from '@app/mongo';
import { Model } from 'mongoose';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { difference, union } from 'lodash';
import { Cron, CronExpression } from '@nestjs/schedule';
import { wowProgressConfig } from '@app/configuration';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
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
  GLOBAL_KEY,
  GuildJobQueue,
  guildsQueue,
  ICharacterQueueWP,
  IQGuild,
  LFG,
  OSINT_LFG_WOW_PROGRESS,
  OSINT_SOURCE,
  OSINT_SOURCE_WOW_PROGRESS,
  randomInt,
  toGuid,
  toSlug,
} from '@app/core';
import ms from 'ms';
import { InjectRepository } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import { Repository } from 'typeorm';
import { pipeline } from 'node:stream/promises';

@Injectable()
export class WowprogressService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WowprogressService.name, {
    timestamp: true,
  });

  constructor(
    private httpService: HttpService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    @InjectRepository(RealmsEntity)
    private readonly realmsRepository: Repository<RealmsEntity>,

    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(guildsQueue.name)
    private readonly queueGuilds: Queue<GuildJobQueue, number>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacters: Queue<CharacterJobQueue, number>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.indexWowProgress(GLOBAL_KEY, wowProgressConfig.init);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async indexWowProgress(
    clearance: string = GLOBAL_KEY,
    init = true,
  ): Promise<void> {
    try {
      if (!init) {
        throw new BadRequestException(`init: ${init}`);
      }

      const dirPath = path.join(__dirname, '..', '..', 'files', 'wowprogress');
      await fs.ensureDir(dirPath);

      const files = await this.getWowProgress(dirPath);
      await this.unzipWowProgress(clearance, files);

      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.warn(`indexWowProgress: directory ${dirPath} has been removed!`);
    } catch (errorException) {
      this.logger.error(`indexWowProgress: ${errorException}`);
    }
  }

  private async getWowProgress(dirPath: string) {
    const response = await this.httpService.axiosRef.get<string>(
      OSINT_SOURCE_WOW_PROGRESS,
    );

    const page = cheerio.load(response.data);
    const wpPage = page.html('body > pre:nth-child(3) > a');

    await Promise.allSettled(
      page(wpPage).map(async (x, node) => {
        const isEuGuild = 'attribs' in node && node.attribs.href.includes('eu_');

        if (!isEuGuild) return;

        const url = node.attribs.href;

        const downloadLink = encodeURI(decodeURI(OSINT_SOURCE_WOW_PROGRESS + url));
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

  private async unzipWowProgress(clearance = GLOBAL_KEY, files: string[]) {
    const [keyEntity] = await getKeys(this.keysRepository, clearance);
    const dirPath = path.join(__dirname, '..', '..', 'files', 'wowprogress');

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

            // TODO interface type
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
                  clientId: keyEntity.client,
                  clientSecret: keyEntity.secret,
                  accessToken: keyEntity.token,
                  createOnlyUnique: true,
                  requestGuildRank: true,
                },
                {
                  jobId: guildGuid,
                  priority: 4,
                },
              );
            }
          } catch (error) {
            this.logger.warn(`unzipWowProgress: ${error}`);
          }
        }, 1),
      ),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(clearance: string = GLOBAL_KEY): Promise<void> {
    try {
      this.logger.log('————————————————————————————————————');
      /**
       * Revoke characters status from old NOW => to PREV
       */
      await delay(60);
      // TODO refactor
      const charactersRevoked = await this.CharacterModel.updateMany(
        { looking_for_guild: { $in: [LFG.NOW, LFG.NEW] } },
        { looking_for_guild: LFG.PREV },
      );

      this.logger.debug(
        `indexLookingForGuild: status LFG-${LFG.NOW} & LFG-${LFG.NEW} revoke from ${charactersRevoked.modifiedCount} characters`,
      );

      const keysEntity = await getKeys(this.keysRepository, clearance);
      const [firstPageUrl, secondPageUrl] = OSINT_LFG_WOW_PROGRESS;

      const [firstPage, secondPage] = await Promise.all([
        await this.getWowProgressLfg(firstPageUrl),
        await this.getWowProgressLfg(secondPageUrl),
      ]);

      const isCharacterPageValid = Boolean(firstPage.length && secondPage.length);
      if (!isCharacterPageValid) return; // TODO

      const characters = union(firstPage, secondPage);

      /**
       * If WowProgress result > 0
       * overwrite LFG.NOW
       */
      this.logger.log(
        `indexLookingForGuild: ${characters.length} characters found in LFG-${LFG.NOW}`,
      );
      if (characters.length > 0) {
        await this.redisService.del(LFG.NOW);
        await this.redisService.sadd(LFG.NOW, charactersFilter);
      }

      /**
       * If LFG.PREV not found
       * then write NOW to PREV
       */
      const OLD_PREV = await this.redisService.smembers(LFG.PREV);
      this.logger.log(
        `indexLookingForGuild: ${OLD_PREV.length} characters found for LFG-${LFG.PREV}`,
      );
      if (OLD_PREV.length === 0) {
        await this.redisService.sadd(LFG.PREV, charactersFilter);
      }

      const NOW = await this.redisService.smembers(LFG.NOW);
      const PREV = await this.redisService.smembers(LFG.PREV);

      const charactersDiffLeave = difference(PREV, NOW);
      const charactersDiffNew = difference(NOW, PREV);

      this.logger.log(
        `indexLookingForGuild: ${PREV.length} characters removed from LFG-${LFG.PREV}`,
      );
      if (PREV.length > 0) {
        await this.redisService.del(LFG.PREV);
        await this.redisService.sadd(LFG.PREV, charactersFilter);
      }

      let index = 0;

      this.logger.log(
        `indexLookingForGuild: ${charactersDiffNew.length} characters added to queue with LFG-${LFG.NOW}`,
      );
      if (charactersDiffNew.length > 0) {
        await lastValueFrom(
          from(charactersDiffNew).pipe(
            mergeMap(async (character, i) => {
              const [name, realmQuery] = character.split('@');

              const realm = await this.RealmModel.findOne(
                { $text: { $search: realmQuery } },
                { score: { $meta: 'textScore' } },
                { projection: { slug: 1 } },
              )
                .sort({ score: { $meta: 'textScore' } })
                .lean();

              if (!realm) {
                throw new NotFoundException(`Realm: ${realmQuery} not found`);
              }

              const characterId = `${name}@${realm.slug}`;

              await this.queueCharacters.add(
                characterId,
                {
                  _id: characterId,
                  name,
                  realm: realm.slug,
                  region: 'eu',
                  clientId: keys[index]._id,
                  clientSecret: keys[index].secret,
                  accessToken: keys[index].token,
                  created_by: OSINT_SOURCE.WOW_PROGRESS_LFG,
                  updated_by: OSINT_SOURCE.WOW_PROGRESS_LFG,
                  guildRank: false,
                  createOnlyUnique: false,
                  updateRIO: true,
                  updateWCL: true,
                  updateWP: true,
                  forceUpdate: randomInt(1000 * 60 * 30, 1000 * 60 * 60),
                  iteration: i,
                },
                {
                  jobId: characterId,
                  priority: 2,
                },
              );

              index++;
              this.logger.log(
                `indexLookingForGuild: Added to character queue: ${characterId}`,
              );
              if (i >= keys.length) index = 0;
            }),
          ),
        );
      }

      const charactersUnset = await this.CharacterModel.updateMany(
        { _id: { $in: charactersDiffLeave } },
        { $unset: { looking_for_guild: 1 } },
      );
      this.logger.debug(
        `indexLookingForGuild: status LFG-${LFG.PREV} unset from ${charactersUnset.modifiedCount} characters`,
      );

      await this.CharacterModel.updateMany(
        { _id: { $in: NOW } },
        { looking_for_guild: LFG.NOW },
      );
      this.logger.debug(
        `indexLookingForGuild: status LFG-${LFG.NOW} set to ${NOW} characters`,
      );

      await this.CharacterModel.updateMany(
        { _id: { $in: charactersDiffNew } },
        { looking_for_guild: LFG.NEW },
      );
      this.logger.debug(
        `indexLookingForGuild: status LFG-${LFG.NEW} set to ${charactersDiffNew.length} characters`,
      );

      this.logger.log('————————————————————————————————————');
    } catch (errorException) {
      this.logger.error(`indexLookingForGuild: ${errorException}`);
    }
  }

  private async getWowProgressLfg(url: string) {
    const wpCharactersQueue: Array<ICharacterQueueWP> = [];
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
          const [region, rawRealm] = wowProgressHTML(preRealm).text().split('-');
          const itemLevel = wowProgressHTML(preItemLevel).text();
          const timestamp = wowProgressHTML(preTimestamp).text();

          const realm = rawRealm.trim();
          const isCharacterValid = Boolean(name && realm);
          if (!isCharacterValid) return;

          const guid = toSlug(`${name}@${realm}`);

          wpCharactersQueue.push({
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
    } catch (errorException) {
      this.logger.error(`getWowProgressLfg: ${errorException}`);
      return wpCharactersQueue;
    }
  }
}
