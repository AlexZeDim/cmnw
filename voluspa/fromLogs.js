const logs_db = require("../db/logs_db");
const Xray = require('x-ray');
let x = Xray();

//TODO pages and realms

async function fromLogs () {
    try {
        for (let page = 1; page < 21; page++) {
            let indexVOLUSPA = await x(`https://www.warcraftlogs.com/zone/reports?zone=24&server=488&page=${page}`,
                '.description-cell',
                [{
                    link: 'a@href',
                }]
            ).then((res) => {
                return res
            });
            let bulkLogs = [];
            for (let i = 0; i < indexVOLUSPA.length; i++) {
                let {link, realm} = indexVOLUSPA[i];
                if (link.includes('reports') === true) {
                    bulkLogs.push({_id: link.match(/(.{16})\s*$/g)[0], isIndexed: false, source: `VOLUSPA-${fromLogs.name}`, realm: 'gordunni'});
                }
            }
            logs_db.insertMany(bulkLogs);
        }
    } catch (e) {
        console.log(e);
    }
}

fromLogs();