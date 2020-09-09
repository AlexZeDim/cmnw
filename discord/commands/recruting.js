const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const humanizeString = require('humanize-string');
require('dotenv').config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: 'recruiting',
  description:
    'Return information about specific character. Example usage: `char блюрателла@гордунни`',
  aliases: ['recruiting', 'recruting', 'Recruiting', 'Recruting', 'RECRUTING', "RECRUITING"],
  cooldown: 60,
  args: true,
  async execute(message, args) {
    console.log(message)
  },
};




/*const Xray = require('x-ray');
const makeDriver = require('request-x-ray');
const driver = makeDriver({
  method: 'GET',
  headers: { 'Accept-Language': 'en-GB,en;q=0.5' },
});
const x = Xray();
x.driver(driver);*/

//const pub_key = '71255109b6687eb1afa4d23f39f2fa76';
//const x = await characters_db.find({isWatched: true, updatedBy: 'OSINT-LFG-NEW'}).limit(20);
//console.log(x);
//console.log(characters_array)
//for (let { name, realm } of characters_array) {
//console.log(`https://www.warcraftlogs.com/character/eu/${toSlug(realm)}/${toSlug(name)}#difficulty=5`)
//let test = await x(encodeURI(`https://www.warcraftlogs.com/character/eu/${toSlug(realm)}/${toSlug(name)}#difficulty=5`), '.best-perf-avg').then(res => res);
// console.log(test);
/*        let wcl_log = await axios(encodeURI(`https://www.warcraftlogs.com:443/v1/rankings/character/${toSlug(name)}/${toSlug(realm)}/EU?api_key=${pub_key}`)).then(r => r.data)
        if (wcl_log) {
          console.log(wcl_log)
        }*/
//}
