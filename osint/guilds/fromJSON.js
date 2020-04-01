const axios = require('axios');
const zlib = require('zlib');
const Xray = require('x-ray');
let x = Xray();
const fs = require('fs');
const realms_db = require("../../db/realms_db");
const guild_db = require("../../db/guilds_db");
const {connection} = require('mongoose');

const {promisify} = require('util');
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const removeDir = promisify(fs.rmdir);

async function fromJSON (queryFind = {locale:'ru_RU'}, path_ = './temp', raidTier = 26, region = 'eu') {
    try {
        console.time(`OSINT-${fromJSON.name}`);

        let realms = await realms_db.find(queryFind).exec();
        realms = realms.map(({name_locale, slug, name}) => { return {slug_locale: name_locale.toLowerCase().replace(/\s/g,"-"), slug: slug, name: name}});

        if (!fs.existsSync(path_)) fs.mkdirSync(path_);
        console.time(`Downloading stage`);
        let urls = await x(`https://www.wowprogress.com/export/ranks/`,'pre',['a@href']).then((res) => {
            return res
        });

        for (let i = 0; i < urls.length; i++) {
            if (urls[i].includes(`_tier${raidTier}.json.gz`) && urls[i].includes(`${region}_`)) {
                let string = encodeURI(decodeURI(urls[i]));
                let file_name = decodeURIComponent(urls[i].substr(urls[i].lastIndexOf('/') + 1));
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
            for (let y = 0; y < files.length; y++) {
                if (files[y].match(/gz$/g)) {
                    console.info(`Unzipping: ${files[y]}`);
                    const fileContents = await fs.createReadStream(`${path_}/${files[y]}`);
                    const writeStream = await fs.createWriteStream(`${path_}/${files[y].slice(0, -3)}`);
                    const unzip = await zlib.createGunzip();
                    await fileContents.pipe(unzip).pipe(writeStream);
                }
            }
        }
        console.timeEnd(`Unzipping stage`);

        console.time(`Parsing JSON files`);
        files = await readDir(path_);
        for (let z = 0; z < files.length; z++) {
            if (files[z].match(/json$/g)) {
                let indexOfRealms = realms.findIndex(r => r.slug_locale === files[z].match(/(?<=_)(.*?)(?=_)/g)[0]);
                if (indexOfRealms !== -1) {
                    console.info(`Parsing: ${files[z]}`);
                    let stringJSON = await readFile(`${path_}/${files[z]}`, {encoding: 'utf8'});
                    const guildsJSON = JSON.parse(stringJSON);
                    for (let g = 0; g < guildsJSON.length; g++) {
                        if (!(guildsJSON[g].name.toLowerCase().replace(/\s/g,"-")).includes('[raid]')) {
                            let guild_ = await guild_db.findById(`${guildsJSON[g].name.toLowerCase().replace(/\s/g, "-")}@${realms[indexOfRealms].slug}`);
                            if (!guild_) {
                                await guild_db.create({
                                    _id: `${guildsJSON[g].name.toLowerCase().replace(/\s/g, "-")}@${realms[indexOfRealms].slug}`,
                                    slug: guildsJSON[g].name.toLowerCase().replace(/\s/g, "-"),
                                    name: guildsJSON[g].name,
                                    realm_slug: realms[indexOfRealms].slug,
                                    realm: realms[indexOfRealms].name,
                                    createdBy: `OSINT-${fromJSON.name}`
                                }).then(gld => console.info(`C,${gld._id}`));
                            } else {
                                console.info(`E,${guildsJSON[g].name.toLowerCase().replace(/\s/g, "-")}@${realms[indexOfRealms].slug}`)
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