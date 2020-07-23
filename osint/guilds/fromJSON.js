/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");
const guild_db = require("../../db/guilds_db");
const keys_db = require("../../db/keys_db");

/**
 * Modules
 */

const axios = require('axios');
const zlib = require('zlib');
const Xray = require('x-ray');
let x = Xray();
const fs = require('fs');

const {promisify} = require('util');
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const removeDir = promisify(fs.rmdir);

/**
 * getGuild indexing
 */

const getGuild = require('../getGuild');

/**
 * Modules
 */

const {toSlug} = require("../../db/setters");

/***
 * We takes every gzip archive from Kernel's WoWProgress (https://www.wowprogress.com/export/ranks/
 * Unzipping it, and parse the received JSON files for new guild names for OSINT-DB (guilds)
 *
 * @param queryFind
 * @param path_
 * @param raidTier
 * @param region
 * @param queryKeys
 * @returns {Promise<void>}
 */

async function fromJSON (queryFind = {locale:'ru_RU'}, path_ = './temp', raidTier = 26, region = 'eu', queryKeys = { tags: `OSINT-indexGuilds` }) {
    try {
        console.time(`OSINT-${fromJSON.name}`);

        let realms = await realms_db.find(queryFind);

        if (!fs.existsSync(path_)) fs.mkdirSync(path_);
        console.time(`Downloading stage`);
        let urls = await x(`https://www.wowprogress.com/export/ranks/`,'pre',['a@href']).then((res) => {
            return res
        });
        for (let url of urls) {
            if (url.includes(`_tier${raidTier}.json.gz`) && url.includes(`${region}_`)) {
                let string = encodeURI(decodeURI(url));
                let file_name = decodeURIComponent(url.substr(url.lastIndexOf('/') + 1));
                const checkFilename = obj => obj.slug_locale === file_name.match(/(?<=_)(.*?)(?=_)/g)[0];
                if (realms.some(checkFilename)) {
                    console.info(`Downloading: ${file_name}`);
                    await axios({
                        url: string,
                        responseType: "stream"
                    }).then(async function (response) {
                        return response.data.pipe(fs.createWriteStream(`${path_}/${file_name}`));
                    });
                }
            }
        }
        console.timeEnd(`Downloading stage`);

        console.time(`Unzipping stage`);
        let files = await readDir(path_);
        if (files) {
            for (let file of files) {
                if (file.match(/gz$/g)) {
                    console.info(`Unzipping: ${file}`);
                    const fileContents = await fs.createReadStream(`${path_}/${file}`);
                    const writeStream = await fs.createWriteStream(`${path_}/${file.slice(0, -3)}`);
                    const unzip = await zlib.createGunzip();
                    await fileContents.pipe(unzip).pipe(writeStream);
                }
            }
        }
        console.timeEnd(`Unzipping stage`);

        console.time(`Parsing JSON files`);
        files = await readDir(path_);
        for (let file of files) {
            if (file.match(/json$/g)) {
                const { token } = await keys_db.findOne(queryKeys);
                let indexOfRealms = realms.findIndex(r => r.slug_locale === file.match(/(?<=_)(.*?)(?=_)/g)[0]);
                if (indexOfRealms !== -1) {
                    console.info(`Parsing: ${file}`);
                    let stringJSON = await readFile(`${path_}/${file}`, {encoding: 'utf8'});
                    if (stringJSON) {
                        const guildsJSON = JSON.parse(stringJSON);
                        if (guildsJSON.length) {
                            for (let guild of guildsJSON) {
                                if (!guild.name.includes('[raid]')) {
                                    let guild_ = await guild_db.findById(toSlug(`${guild.name}@${realms[indexOfRealms].slug}`));
                                    if (!guild_) {
                                        await getGuild(realms[indexOfRealms].slug, guild.name, token, `OSINT-${fromJSON.name}`)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        console.timeEnd(`Parsing JSON files`);
        await removeDir(`${path_}`, { recursive: true });
        connection.close();
        console.timeEnd(`OSINT-${fromJSON.name}`);
    } catch (err) {
        console.error(`E,${err}`)
    }
}

fromJSON();