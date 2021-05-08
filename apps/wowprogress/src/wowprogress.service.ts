import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import Xray from 'x-ray';
import { charactersQueue, GLOBAL_KEY, LFG, OSINT_SOURCE, toSlug } from '@app/core';
import fs from 'fs-extra';
import axios from 'axios';
import path from "path";
import zlib from 'zlib';
import scraper from 'table-scraper';
import { union, differenceBy } from 'lodash';
import { Cron, CronExpression } from '@nestjs/schedule';
import { delay } from '@app/core/utils/converters';

@Injectable()
export class WowprogressService {
  private readonly logger = new Logger(
    WowprogressService.name, true,
  );

  constructor(
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
  ) {
    this.indexWowProgress(GLOBAL_KEY, false);
  }

  /**
   * TODO probably split in to 2 separate functions
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
        x = Xray(),
        urls = await x(`https://www.wowprogress.com/export/ranks/`, 'pre', ['a@href']).then(res => res),
        key = await this.KeyModel.findOne({ tags: clearance });

      if (!key || !key.token) {
        this.logger.error(`indexWowProgress: clearance: ${clearance} key not found`);
        return
      }

      const dir: string = path.join(__dirname, '..', '..', 'files', 'wowprogress');
      await fs.ensureDir(dir);

      for (let url of urls) {
        if (!url.includes(`eu_`)) continue;

        const
          download: string = encodeURI(decodeURI(url)),
          file_name: string = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1)),
          match = file_name.match(/(?<=_)(.*?)(?=_)/g);

        if (!match || !match.length) continue;

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

        if (!realm) continue;

        await axios({
          url: download,
          responseType: 'stream',
        }).then(async response => response.data.pipe(fs.createWriteStream(`${dir}/${file_name}`)));
      }

      const files: string[] = await fs.readdir(dir);

      await Promise.all(
        files.map(async (file: string) => {
          if (!file.match(/gz$/g)) return;

          const match = file.match(/(?<=_)(.*?)(?=_)/g);

          if (!match || !match.length) return;

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

          if (!realm) return;

          const
            buffer = await fs.readFile(`${dir}/${file}`),
            data = await zlib.unzipSync(buffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString(),
            json = JSON.parse(data);

          // TODO logger coverage

          if (json && Array.isArray(json) && json.length) {
            for (const guild of json) {
              if (!guild.name || guild.name.includes('[Raid]')) continue;
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
        })
      );
      await fs.rmdirSync(dir, { recursive: true });
    } catch (e) {
      this.logger.error(`indexWowProgress: ${e}`)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async indexWowProgressLfg(clearance: string = GLOBAL_KEY): Promise<void> {
    try {
      /**
       * Revoke characters status from old NOW => to PREV
       */
      const charactersRevoked = await this.CharacterModel.updateMany({ looking_for_guild: { $in: [LFG.NOW, LFG.NEW] } }, { looking_for_guild: LFG.PREV });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.NOW} and ${LFG.NEW} revoked from ${charactersRevoked.nModified} characters`);

      const keys = await this.KeyModel.find({ tags: clearance });
      if (!keys.length) {
        this.logger.error(`indexLookingForGuild: ${keys.length} keys found`);
        return
      }

      let index: number = 0;

      const [first, second] = await Promise.all([
        await scraper.get('https://www.wowprogress.com/gearscore/char_rating/lfg.1/sortby.ts').then((tableData) => tableData[0] || []),
        await scraper.get('https://www.wowprogress.com/gearscore/char_rating/next/0/lfg.1/sortby.ts').then((tableData) => tableData[0] || [])
      ]);
      const wpCharacters: Record<string, string>[] = union(first, second);
      wpCharacters.map(async (character, i) => {
        if (character.Character && character.Realm) {
          const name = character.Character.trim();
          const realm = character.Realm.split('-')[1].trim();
          const _id = toSlug(`${name}@${realm}`);
          this.logger.debug(`Added to queue: ${_id}`)
          await this.queueCharacters.add(
            _id,
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
              forceUpdate: 3600000,
              iteration: i,
            }, {
              jobId: _id,
              priority: 2,
            }
          )
        }
        index++
        if (i >= keys.length) index = 0;
      })

      await delay(120);
      const charactersPrev = await this.CharacterModel.find({ looking_for_guild: LFG.PREV });
      const charactersNow = await this.CharacterModel.find({ looking_for_guild: LFG.NOW });
      this.logger.debug(`indexLookingForGuild: NOW: ${charactersNow.length} SOURCE: ${wpCharacters.length} PREV: ${charactersPrev.length}`);

      const charactersNew = differenceBy(charactersNow, charactersPrev, '_id');
      await this.CharacterModel.updateMany({ _id: { $in: charactersNew.map(c => c._id) } }, { looking_for_guild: LFG.NEW });

      const charactersUnset = await this.CharacterModel.updateMany({ looking_for_guild: LFG.PREV }, { $unset: { looking_for_guild: 1 } });
      this.logger.debug(`indexLookingForGuild: status LFG: ${LFG.PREV} unset from ${charactersUnset.nModified} characters`);
    } catch (e) {
      this.logger.error(`indexLookingForGuild: ${e}`)
    }
  }
}
