import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
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
import { delay } from '@app/core/utils/converters';
import { wowprogressConfig } from '@app/configuration';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import cheerio from 'cheerio';
import { HttpService } from '@nestjs/axios';
import {
  IQCharacter,
  charactersQueue,
  GLOBAL_KEY,
  IQGuild, guildsQueue,
  ICharacterWpLfg,
  LFG,
  OSINT_SOURCE,
  randomInt,
  toSlug,
} from '@app/core';

@Injectable()
export class WowprogressService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    WowprogressService.name, { timestamp: true },
  );

  constructor(
    private httpService: HttpService,
    @InjectRedis()
    private readonly redisService: Redis,
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(guildsQueue.name)
    private readonly queueGuilds: Queue<IQGuild, number>,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacters: Queue<IQCharacter, number>,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexWowProgress(GLOBAL_KEY, wowprogressConfig.index_init);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async indexWowProgress(clearance: string = GLOBAL_KEY, init: boolean = true): Promise<void> {
    try {

      if (!init) {
        throw new BadRequestException(`init: ${init}`);
      }

      const
        response = await lastValueFrom(this.httpService.get('https://www.wowprogress.com/export/ranks/')),
        key = await this.KeyModel.findOne({ tags: clearance });

      if (!key || !key.token) {
        throw new NotFoundException(`clearance: ${clearance} key not found`);
      }

      const dir: string = path.join(__dirname, '..', '..', 'files', 'wowprogress');
      await fs.ensureDir(dir);

      const page = cheerio.load(response.data);
      const wpPage = page
        .html('body > pre:nth-child(3) > a');

      page(wpPage).map(async (x, node) => {
        if ('attribs' in node) {
          const url = node.attribs.href;
          if (!url.includes(`eu_`)) return;

          const
            download: string = encodeURI(decodeURI(url)),
            fileName: string = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1)),
            match = fileName.match(/(?<=_)(.*?)(?=_)/g);

          if (!match || !match.length) return;

          const
            [realmQuery] = match,
            realm = await this.RealmModel
              .findOne(
                { $text: { $search: realmQuery } },
                { score: { $meta: 'textScore' } },
                { projection: { slug_locale: 1 } }
              )
              .sort({ score: { $meta: 'textScore' } })
              .lean();

          if (!realm) return;

          await lastValueFrom(
            this.httpService
              .request({
                url: download,
                responseType: 'stream',
               })
            )
            .then(
              async response => response.data
                .pipe(
                  fs.createWriteStream(`${dir}/${fileName}`)
                )
            );
        }
      });


      const files: string[] = await fs.readdir(dir);

      await lastValueFrom(from(files).pipe(
        mergeMap(async (file) => {
          try {
            if (!file.match(/gz$/g)) {
              this.logger.warn(`indexWowProgress: file ${file} not match pattern #1`);
              return;
            }

            const match = file.match(/(?<=_)(.*?)(?=_)/g);

            if (!match || !match.length) {
              this.logger.warn(`indexWowProgress: file ${file} not match pattern #2`);
              return;
            }

            const
              [realmQuery] = match,
              realm = await this.RealmModel
                .findOne(
                  { $text: { $search: realmQuery } },
                  { score: { $meta: 'textScore' } },
                  { projection: { slug: 1 } }
                )
                .sort({ score: { $meta: 'textScore' } })
                .lean();

            if (!realm) {
              this.logger.warn(`indexWowProgress: realm ${realmQuery} not found!`);
              return;
            }

            const
              buffer = await fs.readFile(`${dir}/${file}`),
              data = await zlib.unzipSync(buffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString(),
              json = JSON.parse(data);

            if (json && Array.isArray(json) && json.length) {
              for (const guild of json) {

                if (!guild.name || guild.name.includes('[Raid]')) {
                 this.logger.log(`indexWowProgress: guild ${guild.name} have negative [Raid] pattern, skipping...`);
                 continue;
                }

                const _id: string = toSlug(`${guild.name}@${realm.slug}`);

                await this.queueGuilds.add(
                  _id,
                  {
                    _id: _id,
                    name: guild.name,
                    realm: realm.slug,
                    forceUpdate: 1000 * 60 * 60 * 4,
                    created_by: OSINT_SOURCE.WOWPROGRESS,
                    updated_by: OSINT_SOURCE.WOWPROGRESS,
                    region: 'eu',
                    clientId: key._id,
                    clientSecret: key.secret,
                    accessToken: key.token,
                    guildRank: false,
                    createOnlyUnique: false,
                  },
                  {
                    jobId: _id,
                    priority: 4
                  }
                )
              }
            }
          } catch (error) {
            this.logger.warn(`indexWowProgress: file ${file} has error: ${error}`);
          }
        }, 1),
      ));

      await fs.rmdirSync(dir, { recursive: true });
      this.logger.warn(`indexWowProgress: directory ${dir} has been removed!`);
    } catch (errorException) {
      this.logger.error(`indexWowProgress: ${errorException}`)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(clearance: string = GLOBAL_KEY): Promise<void> {
    try {
      /**
       * Revoke characters status from old NOW => to PREV
       */
      await delay(60);
      const charactersRevoked = await this.CharacterModel
        .updateMany(
        { looking_for_guild: { $in: [LFG.NOW, LFG.NEW] } },
        { looking_for_guild: LFG.PREV }
        );

      this.logger.debug(`indexLookingForGuild: status LFG revoke from ${charactersRevoked.modifiedCount} characters`);

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        throw new NotFoundException(`${keys.length} keys found`)
      }

      const [firstPage, secondPage] = await Promise.all([
        await this.getWowProgressLfg('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts'),
        await this.getWowProgressLfg('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts'),
      ]);

      const characters: ICharacterWpLfg[] = union(firstPage, secondPage);

      const charactersFilter: string[] = characters.map((character) => {
        const
          name = character.name.trim(),
          realm = character.realm.split('-')[1].trim();

        return toSlug(`${name}@${realm}`);
      });

      /**
       * If WowProgress result > 0
       * overwrite LFG.NOW
       */
      if (charactersFilter.length > 0) {
        await this.redisService.del(LFG.NOW);
        await this.redisService.sadd(LFG.NOW, charactersFilter);
      }

      /**
       * If LFG.PREV not found
       * then write NOW to PREV
       */
      const OLD_PREV = await this.redisService.smembers(LFG.PREV);
      if (OLD_PREV.length === 0) {
        await this.redisService.sadd(LFG.PREV, charactersFilter);
      }

      const NOW = await this.redisService.smembers(LFG.NOW);
      const PREV = await this.redisService.smembers(LFG.PREV);

      const charactersDiffLeave = difference(PREV, NOW);
      const charactersDiffNew = difference(NOW, PREV);

      if (PREV.length > 0) {
        await this.redisService.sadd(LFG.PREV, charactersFilter);
      }

      let index: number = 0;

      await lastValueFrom(
        from(charactersDiffNew).pipe(
          mergeMap(async (character_id, i) => {

            const [name, realm] = character_id.split('@');

            await this.queueCharacters.add(
              character_id,
              {
                _id: character_id,
                name,
                realm,
                region: 'eu',
                clientId: keys[index]._id,
                clientSecret: keys[index].secret,
                accessToken: keys[index].token,
                created_by: OSINT_SOURCE.WOWPROGRESSLFG,
                updated_by: OSINT_SOURCE.WOWPROGRESSLFG,
                guildRank: false,
                createOnlyUnique: false,
                updateRIO: true,
                updateWCL: true,
                updateWP: true,
                forceUpdate: randomInt(1000 * 60 * 30, 1000 * 60 * 60),
                iteration: i,
              }, {
                jobId: character_id,
                priority: 2,
              }
            );

            index++
            this.logger.log(`Added to character queue: ${character_id}`);
            if (i >= keys.length) index = 0;
          })
        )
      );

      const charactersUnset = await this.CharacterModel.updateMany({ _id: { $in: charactersDiffLeave } }, { $unset: { looking_for_guild: 1 } });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.PREV} unset from ${charactersUnset.modifiedCount} characters`);

      await this.CharacterModel.updateMany({ _id: { $in: NOW } }, { looking_for_guild: LFG.NOW });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.NOW} set to ${NOW} characters`);

      await this.CharacterModel.updateMany({ _id: { $in: charactersDiffNew } }, { looking_for_guild: LFG.NEW });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.NEW} set to ${charactersDiffNew.length} characters`);
    } catch (errorException) {
      this.logger.error(`indexLookingForGuild: ${errorException}`)
    }
  }

  private async getWowProgressLfg(url: string): Promise<ICharacterWpLfg[]> {
    try {
      const charactersInQueue: ICharacterWpLfg[] = [];
      const response = await lastValueFrom(this.httpService.get(url));
      const page = cheerio.load(response.data);

      const lfgPage = page.html('table.rating tbody tr');

      page(lfgPage).map(async (x, node) => {
        const td = page(node).find('td');
        const name = page(td[0]).text();
        const guild = page(td[1]).text();
        const raid = page(td[2]).text();
        const realm = page(td[3]).text();
        const ilvl = page(td[4]).text();
        const timestamp = page(td[5]).text();
        if (!!name) charactersInQueue.push({ name, guild, raid, realm, ilvl, timestamp })
      });

      return charactersInQueue;
    } catch (e) {
      this.logger.error(e);
    }
  }
}
