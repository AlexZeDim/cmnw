import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Key, Realm } from '@app/mongo';
import { Model } from "mongoose";
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import Xray from 'x-ray';
import { GLOBAL_KEY, OSINT_SOURCE, toSlug } from '@app/core';
import fs from 'fs-extra';
import axios from 'axios';
import path from "path";
import zlib from 'zlib';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    @BullQueueInject(guildsQueue.name)
    private readonly queue: Queue,
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
        urls = await x(`https://www.wowprogress.com/export/ranks/`, 'pre', ['a@href',]).then(res => res),
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
        files.map(async (file: string, i: number) => {
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
              await this.queue.add(
                _id,
                {
                  _id: _id,
                  name: guild.name,
                  realm: realm.slug,
                  members: [],
                  forceUpdate: false,
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
}
