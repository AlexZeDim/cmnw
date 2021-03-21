import '../db/mongo/mongo.connection';
import {KeysModel, RealmModel} from '../db/mongo/mongo.model';
import {queueGuilds} from './osint.queue';
import {toSlug} from '../db/mongo/refs';
import Xray from 'x-ray';
import fs from 'fs-extra';
import axios from 'axios';
import path from "path";
import zlib from 'zlib';

const indexGuildsJSON = async () => {
  try {
    const
      x = Xray(),
      urls = await x(`https://www.wowprogress.com/export/ranks/`, 'pre', ['a@href',]).then(res => res),
      key = await KeysModel.findOne({ tags: 'BlizzardAPI' });

    if (!key) return;

    const dir = path.join(__dirname, '..', '..', 'import', 'wowprogress');
    await fs.ensureDir(dir);

    for (let url of urls) {
      if (url.includes(`eu_`)) {

        const
          download: string = encodeURI(decodeURI(url)),
          file_name: string = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1)),
          match = file_name.match(/(?<=_)(.*?)(?=_)/g);

        if (!match || !match.length) continue

        const
          [realm_query] = match,
          realm = await RealmModel
            .findOne(
              { $text: { $search: realm_query } },
              { score: { $meta: 'textScore' } },
              { projection: { slug_locale: 1 } }
            )
            .sort({ score: { $meta: 'textScore' } })
            .lean();

        if (!realm) continue

        await axios({
          url: download,
          responseType: 'stream',
        }).then(async response => response.data.pipe(fs.createWriteStream(`${dir}/${file_name}`)));

      }
    }

    const files: string[] = await fs.readdir(dir);

    await Promise.all(files.map(async (file: string, i: number) => {
      if (file.match(/gz$/g)) {

        const match = file.match(/(?<=_)(.*?)(?=_)/g);

        if (!match || !match.length) return;

        const
          [realm_query] = match,
          realm = await RealmModel
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

        console.log(i)
        if (json && Array.isArray(json) && json.length) {
          for (const guild of json) {
            if (!guild.name || guild.name.includes('[Raid]')) continue;
            const _id: string = toSlug(`${guild.name}@${realm.slug}`)
            await queueGuilds.add(
              _id,
            {
              _id: _id,
              name: guild.name,
              realm: realm.slug,
              members: [],
              region: 'eu',
              clientId: key._id,
              clientSecret: key.secret,
              accessToken: key.token
            },
            { jobId: _id }
            )
          }
        }
      }
    }))

    await fs.rmdirSync(dir, { recursive: true });
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0);
  }
}

indexGuildsJSON()
