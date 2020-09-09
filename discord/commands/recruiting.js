const discord_db = require('../../db/discord_db')
require('dotenv').config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: 'recruiting',
  description:
    'Subscribes Discord server and selected channel (via ID, *current by default*) for announcements of characters from Kernel\'s WoWProgress, which have quene in Looking for Guild recently `recruiting`',
  aliases: ['recruiting', 'recruting', 'Recruiting', 'Recruting', 'RECRUTING', "RECRUITING"],
  cooldown: 60,
  guildOnly: true,
  args: true,
  async execute(message, args) {
    const params = args.split(' ');
    let notification = 'Your subscription has been successfully updated';
    let channel = {
      _id: message.channel.id,
      name: message.channel.name
    };
    /** Set channelID */
    if (params.includes('-channel')) {
      channel._id = parseInt(params[params.indexOf('-channel') + 1]);
      let { name } = await message.channel.guild.channels.cache.get((channel._id).toString());
      channel.name = name;
    }
    let discord_server = await discord_db.findById(parseInt(message.channel.guild.id))
    if (!discord_server) {
      discord_server = new discord_db({
        _id: message.channel.guild.id,
        name: message.channel.guild.name,
        channel: channel
      })
      notification = 'You have been successfully subscribed';
    }
    discord_server.channel = channel;
    await discord_server.save()
    await message.channel.send(notification);
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
