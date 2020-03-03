const axios = require('axios');
const zlib = require('zlib');
const Xray = require('x-ray');
let x = Xray();

const fs = require('fs');
const realms_db = require("../../db/realms_db");

const {promisify} = require('util');
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const removeDir = promisify(fs.rmdir);

async function fromJSON (path_ = './temp') {
    try {
        console.time(`VOLUSPA-${fromJSON.name}`);

        let realms = await realms_db.find({locale:'ru_RU'}).exec();
        realms = realms.map(({name_locale, slug}) => { return {slug_locale: name_locale.toLowerCase().replace(/\s/g,"-"), slug: slug}});

        if (!fs.existsSync(path_)) fs.mkdirSync(path_);
        console.time(`Downloading stage`);
        let urls = await x(`https://www.wowprogress.com/export/ranks/`,'pre',['a@href']).then((res) => {
            return res
        });

        for (let i = 0; i < urls.length; i++) {
            if (urls[i].includes('_tier26.json.gz') && urls[i].includes('eu_')) {
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
                    console.log(realms[indexOfRealms].slug);
                    console.info(`Parsing: ${files[z]}`);
                    let str = await readFile(`${path_}/${files[z]}`, {encoding: 'utf8'});
                    const obj = JSON.parse(str);
                    //TODO
                    console.log(obj);
                }
            }
        }
        console.timeEnd(`Parsing JSON files`);

        await removeDir(`${path_}`, { recursive: true });
        console.timeEnd(`VOLUSPA-${fromJSON.name}`);
    } catch (err) {
        console.log(err)
    }
}

fromJSON();

//'C:\\Users\\AlexZ\\Downloads\\eu_гордунни_tier26.json'