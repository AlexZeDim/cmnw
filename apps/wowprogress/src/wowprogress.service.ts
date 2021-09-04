import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { charactersQueue, GLOBAL_KEY, LFG, OSINT_SOURCE, randomInt, toSlug } from '@app/core';
import fs from 'fs-extra';
import path from "path";
import zlib from 'zlib';
import scraper from 'table-scraper';
import { union, differenceBy } from 'lodash';
import { Cron, CronExpression } from '@nestjs/schedule';
import { delay } from '@app/core/utils/converters';
import { nanoid } from 'nanoid'
import { wowprogressConfig } from '@app/configuration';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import cheerio from "cheerio";
import { HttpService } from '@nestjs/axios';

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
    private readonly queueGuilds: Queue,
    @BullQueueInject(charactersQueue.name)
    private readonly queueCharacters: Queue,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.indexWowProgress(GLOBAL_KEY, wowprogressConfig.index_init);
  }

  /**
   * @param clearance
   * @param init
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async indexWowProgress(clearance: string = GLOBAL_KEY, init: boolean = true): Promise<void> {
    try {

      if (!init) {
        this.logger.log(`indexWowProgress: init: ${init}`);
        return;
      }

      const
        response = await this.httpService.get('https://www.wowprogress.com/export/ranks/').toPromise(),
        key = await this.KeyModel.findOne({ tags: clearance });

      if (!key || !key.token) {
        this.logger.error(`indexWowProgress: clearance: ${clearance} key not found`);
        return
      }

      const dir: string = path.join(__dirname, '..', '..', 'files', 'wowprogress');
      await fs.ensureDir(dir);

      const page = cheerio.load(response.data);
      const test = page
        .html('body > pre:nth-child(3) > a');

      page(test).map(async (x, node) => {
        if ('attribs' in node) {
          const url = node.attribs.href;
          if (!url.includes(`eu_`)) return;

          const
            download: string = encodeURI(decodeURI(url)),
            file_name: string = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1)),
            match = file_name.match(/(?<=_)(.*?)(?=_)/g);

          if (!match || !match.length) return;

          const
            [realm_query] = match,
            realm = await this.RealmModel
              .findOne(
                { $text: { $search: realm_query } },
                { score: { $meta: 'textScore' } },
                { projection: { slug_locale: 1 } }
              )
              .sort({ score: { $meta: 'textScore' } })
              .lean();

          if (!realm) return;

          await this.httpService
            .request({
              url: download,
              responseType: 'stream',
             })
            .toPromise()
            .then(
              async response => response.data
                .pipe(
                  fs.createWriteStream(`${dir}/${file_name}`)
                )
            );
        }
      });


      const files: string[] = await fs.readdir(dir);

      await from(files).pipe(
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
              [realm_query] = match,
              realm = await this.RealmModel
                .findOne(
                  { $text: { $search: realm_query } },
                  { score: { $meta: 'textScore' } },
                  { projection: { slug: 1 } }
                )
                .sort({ score: { $meta: 'textScore' } })
                .lean();

            if (!realm) {
              this.logger.warn(`indexWowProgress: realm ${realm_query} not found!`);
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
                    members: [],
                    forceUpdate: 86400000,
                    region: 'eu',
                    created_by: OSINT_SOURCE.WOWPROGRESS,
                    updated_by: OSINT_SOURCE.WOWPROGRESS,
                    clientId: key._id,
                    clientSecret: key.secret,
                    accessToken: key.token
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
      ).toPromise();

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

      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.NOW} and ${LFG.NEW} revoked from ${charactersRevoked.nModified} characters to ${LFG.PREV}`);
      const charactersPrev = await this.CharacterModel.find({ looking_for_guild: LFG.PREV });

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        this.logger.error(`indexLookingForGuild: ${keys.length} keys found`);
        return
      }

      let index: number = 0;

      // TODO refactor
      const [first, second] = await Promise.all([
        await scraper.get('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts').then((tableData) => tableData[0] || []),
        await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then((tableData) => tableData[0] || [])
      ]);

      const wpCharacters: Record<string, string>[] = union(first, second);

      await from(wpCharacters).pipe(
        mergeMap(async (character, i) => {

          if (!character.Character && !character.Realm) return;
          index++

          const
            name = character.Character.trim(),
            realm = character.Realm.split('-')[1].trim(),
            _id = toSlug(`${name}@${realm}`),
            jobId = `${_id}:${nanoid(10)}`,
            forceUpdate = randomInt(3600000, 7200000);

          await this.queueCharacters.add(
            jobId,
            {
              _id,
              name,
              realm,
              region: 'eu',
              clientId: keys[index]._id,
              clientSecret: keys[index].secret,
              accessToken: keys[index].token,
              created_by: OSINT_SOURCE.WOWPROGRESSLFG,
              updated_by: OSINT_SOURCE.WOWPROGRESSLFG,
              looking_for_guild: LFG.NOW,
              guildRank: false,
              createOnlyUnique: false,
              updateRIO: true,
              updateWCL: true,
              updateWP: true,
              forceUpdate,
              iteration: i,
            }, {
              jobId,
              priority: 2,
            }
          );

          this.logger.log(`Added to character queue: ${_id}`);
          if (i >= keys.length) index = 0;
        }, 1),
      ).toPromise();

      await delay(120);
      const charactersNow = await this.CharacterModel.find({ looking_for_guild: LFG.NOW });
      this.logger.debug(`indexLookingForGuild: NOW: ${charactersNow.length} SOURCE: ${wpCharacters.length} PREV: ${charactersPrev.length}`);

      const charactersNew = differenceBy(charactersNow, charactersPrev, '_id');
      const charactersLeave = differenceBy(charactersPrev, charactersNow, '_id');
      const charactersUnset = await this.CharacterModel.updateMany({ _id: { $in: charactersLeave.map(c => c._id) } }, { $unset: { looking_for_guild: 1 } });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.PREV} unset from ${charactersUnset.nModified} characters`);

      await this.CharacterModel.updateMany({ _id: { $in: charactersNew.map(c => c._id) } }, { looking_for_guild: LFG.NEW });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.NEW} set to ${charactersNew.length} characters`);
    } catch (errorException) {
      this.logger.error(`indexLookingForGuild: ${errorException}`)
    }
  }
}
