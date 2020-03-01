const fs = require('fs');
const path = require('path');
const axios = require('axios');
const gzipy = require('gzipy');
const zlib = require('zlib');
const Xray = require('x-ray');
let x = Xray();

async function downloadImage () {
    try {
        //TODO all paths
        //TODO logs
        //TODO delete folder
        const url = 'https://www.wowprogress.com/export/ranks/';
        const path = "C:\\testing\\test.gz";
        //const writer = fs.createWriteStream(path);
        /*
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
                }).then(function (response) {
                    return response.data.pipe(fs.createWriteStream(`/testing/${file_name}`));
                });
            }
        }*/
        console.log('here');
        fs.readdir('C:/testing', function (err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            files.forEach( async (file) => {
                // Do whatever you want to do with the file
                await gzipy.decompress(`C:/testing/${file}`, `C:/testing/${file.slice(0, -3)}`, function(error)
                    {
                        if (error){ /* Something went wrong... */ }
                        console.log('File decompressed');
                    });
            });
        });
        //
    } catch (err) {
        console.log(err)
    }
}

downloadImage();

//'C:\\Users\\AlexZ\\Downloads\\eu_гордунни_tier26.json'