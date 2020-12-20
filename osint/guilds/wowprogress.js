/**
 * Mongo Models
 */
require('../../db/connection')
const realms_db = require('../../db/models/realms_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const axios = require('axios');
const zlib = require('zlib');
const Xray = require('x-ray');
const x = Xray();
const fs = require('fs');

const { promisify } = require('util');
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const removeDir = promisify(fs.rmdir);

/**
 * getGuild indexing
 */

const getGuild = require('./get_guild');

/**
 * Modules
 */

const schedule = require('node-schedule');

/***
 * We takes every gzip archive from Kernel's WoWProgress (https://www.wowprogress.com/export/ranks/
 * Unzipping it, and parse the received JSON files for new guild names for OSINT-DB (guilds)
 *
 * @param queryFind
 * @param path
 * @param raidTier
 * @param region
 * @param queryKeys
 * @returns {Promise<void>}
 */

schedule.scheduleJob('0 5 1,15 * *', async (
  t,
  queryFind = { region: 'Europe' },
  path = './temp',
  raidTier = 27,
  region = 'eu',
  queryKeys = { tags: `OSINT-indexGuilds` },
) => {
  try {
    console.time(`OSINT-fromJSON`);

    const realms = await realms_db.find(queryFind);

    if (!fs.existsSync(path)) fs.mkdirSync(path);
    console.time(`Downloading stage`);
    const urls = await x(`https://www.wowprogress.com/export/ranks/`, 'pre', [
      'a@href',
    ]).then(res => res);
    for (const url of urls) {
      if (
        url.includes(`_tier${raidTier}.json.gz`) &&
        url.includes(`${region}_`)
      ) {
        const string = encodeURI(decodeURI(url));
        const file_name = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1));
        const checkFilename = obj => obj.slug_locale === file_name.match(/(?<=_)(.*?)(?=_)/g)[0];
        if (realms.some(checkFilename)) {
          console.info(`Downloading: ${file_name}`);
          await axios({
            url: string,
            responseType: 'stream',
          }).then(async response => response.data.pipe(fs.createWriteStream(`${path}/${file_name}`)));
        }
      }
    }
    console.timeEnd(`Downloading stage`);

    console.time(`Unzipping stage`);
    const unzip_files = await readDir(path);
    if (unzip_files) {
      for (const file of unzip_files) {
        if (file.match(/gz$/g)) {
          console.info(`Unzipping: ${file}`);
          const fileContents = await fs.createReadStream(`${path}/${file}`);
          const writeStream = await fs.createWriteStream(
            `${path}/${file.slice(0, -3)}`,
          );
          const unzip = await zlib.createGunzip();
          await fileContents.pipe(unzip).pipe(writeStream);
        }
      }
    }
    console.timeEnd(`Unzipping stage`);

    console.time(`Parsing JSON files`);
    const read_files = await readDir(path);
    let iterations = 0;
    for (const file of read_files) {
      if (file.match(/json$/g)) {
        const { token } = await keys_db.findOne(queryKeys);
        const indexOfRealms = realms.findIndex(r => r.slug_locale === file.match(/(?<=_)(.*?)(?=_)/g)[0]);
        if (indexOfRealms !== -1) {
          console.info(`Parsing: ${file}`);
          const stringJSON = await readFile(`${path}/${file}`);
          if (stringJSON) {
            const guildsJSON = await JSON.parse(stringJSON);
            if (guildsJSON.length) {
              for (let guild of guildsJSON) {
                if (!guild.name.includes('[raid]')) {
                  iterations++
                  await getGuild({
                    name: guild.name,
                    realm: { slug: realms[indexOfRealms].slug },
                    createdBy: `OSINT-fromJSON`,
                    updatedBy: `OSINT-fromJSON`,
                    iterations: iterations,
                    token: token,
                    createOnlyUnique: true
                  });
                }
              }
            }
          }
        }
      }
    }
    console.timeEnd(`Parsing JSON files`);
    await removeDir(`${path}`, { recursive: true });
  } catch (error) {
    console.error(`E,${error}`);
  } finally {
    console.timeEnd(`OSINT-fromJSON`);
    process.exit(0)
  }
});
