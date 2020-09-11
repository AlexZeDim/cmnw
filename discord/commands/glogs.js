const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  name: 'glogs',
  description:
    'Search for last 20 events about certain guild in OSINT Logs. Realm transfers are covered. Example usage: `glogs депортация@gordunni ` ',
  aliases: ['guild_logs', 'GLOGS', 'GUILD_LOGS', 'Glogs'],
  args: true,
  async execute(message, args) {
    const [name, realm] = args.split('@');
    let embed = new MessageEmbed();
    let guild_logs = await axios
      .get(
        encodeURI(
          `http://${process.env.localhost}:3030/api/guilds/guild_logs/${name}@${realm}`,
        ),
      )
      .then(({ data }) => {
        if (data.length) {
          embed.setTitle(`${name}@${realm}`.toString().toUpperCase());
          embed.setURL(
            `https://${process.env.domain}/guild/${data._id.split('@')[1]}/${
              data._id.split('@')[0]
            }`,
          );
          for (let i = 0; i < data.length; i++) {
            if (i === 14) {
              embed.addField(
                `─────────────`,
                `
                  Want 
                  More
                  To
                  Find?
                  [Conglomerat](https://${process.env.domain}/find/a/${query})
                  ─────────────`,
                true,
              );
              break;
            }
            embed.addField(
        `─────────────`,
        `
              Event: ${data[i].action}
              Message: ${data[i].message}
              After: ${new Date(data[i].after).toLocaleString('en-GB')}
              Before: ${new Date(data[i].before).toLocaleString('en-GB')}
              ─────────────`,
        true,
            );
          }
          embed.setFooter(`OSINT-Logs`);
        }
        return embed;
      });
    await message.channel.send(guild_logs);
  },
};
