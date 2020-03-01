const fs = require('fs');
const path = require('path');
const axios = require('axios');
const gzipy = require('gzipy');
const zlib = require('zlib');
const Xray = require('x-ray');
let x = Xray();

const util = require('util');
const readdir = util.promisify(fs.readdir);

async function downloadImage () {
    try {
        //TODO all paths
        //TODO logs
        //TODO delete folder
        const url = 'https://www.wowprogress.com/export/ranks/';
        const path = "C:\\testing\\test.gz";
        let urls = await x(`https://www.wowprogress.com/export/ranks/`,'pre',['a@href']).then((res) => {
            return res
        });
        for (let i = 0; i < 50; i++) { //urls.length
            if (urls[i].includes('_tier26.json.gz') && urls[i].includes('eu_')) {
                let string = encodeURI(decodeURI(urls[i]));
                let file_name = decodeURIComponent(urls[i].substr(urls[i].lastIndexOf('/') + 1));
                console.log(string, file_name);
                await axios({
                    url: string,
                    responseType: "stream"
                }).then(async function (response) {
                    return response.data.pipe(fs.createWriteStream(`/testing/${file_name}`));
                });
            }
        }
        console.log('here');
        let files = await readdir('C:/testing');
        if (files) {
            for (let y = 0; y < files.length; y++) {
                const fileContents = await fs.createReadStream(`C:/testing/${files[y]}`);
                const writeStream = await fs.createWriteStream(`C:/testing/${files[y].slice(0, -3)}`);
                const unzip = await zlib.createGunzip();
                await fileContents.pipe(unzip).pipe(writeStream);
            }
        }
        //await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('here1');
        /*await fs.readdir('C:/testing', async function (err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            console.log(files);
            files.forEach( async (file) => {

                if (file.match(/json$/g)) {
                    let str = await fs.readFileSync(`C:/testing/${file}`,'utf8');
                    let obj = await JSON.parse(str);
                    console.log(obj)
                }
            })
        });*/
        //
    } catch (err) {
        console.log(err)
    }
}

downloadImage();

//'C:\\Users\\AlexZ\\Downloads\\eu_гордунни_tier26.json'