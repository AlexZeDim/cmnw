const { MessageEmbed } = require('discord.js');
const axios = require('axios');
//const humanizeString = require('humanize-string');
require('dotenv').config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: 'realmsinfo',
  description:
    'Return information about selected realm(s) and it\'s population. Example usage: `realmsinfo gordunni`',
  aliases: ['realminfo', 'REALMSINFO', 'REALMINFO', 'Realminfo', 'Realmsinfo'],
  args: true,
  async execute(message, args) {
    console.log(args)
    const realm = args;
    console.log(realm);
    let embed = new MessageEmbed();
    let realmsinfo = await axios
      .get(
        encodeURI(
          `http://${process.env.localhost}:3030/api/realms/${realm}`,
        ),
      )
      .then(({ data }) => {
        if (data && data.length) {
          embed.setTitle('REALMSINFO');
          embed.setURL(
            encodeURI(
              `https://${process.env.domain}/realmsinfo/${realm}`,
            ),
          );
          if (data.length > 1) {
            for (let i = 0; i < data.length; i++) {
              if (i === 4) {
                embed.addField(
                  `─────────────`,
                  `
                        Check
                        Realm
                        List
                        At
                        [Conglomerat](https://${process.env.domain}/realmsinfo/${realm})
                        ─────────────
                        `,
                  true,
                );
                break;
              }
              embed.addField(
                `─────────────`,
                `
                    Name: ${data[i].name}
                    Type: ${data[i].name_locale || data[i].name}
                    Locale: ${data[i].locale}
                    Characters
                    Total: ${data[i].players.total || 0}
                    Alliance: ${data[i].players.alliance || 0}
                    Horde: ${data[i].players.horde || 0}
                    Max Level: ${data[i].players.max_level || 0}
                    Unique: ${data[i].players.unique || 0}
                    Guilds
                    Total: ${data[i].guilds.total || 0}
                    Alliance: ${data[i].guilds.alliance || 0}
                    Horde: ${data[i].guilds.horde || 0}
                    ─────────────
                    `,
                true,
              );
            }
          } else {
            //TODO only one realm
          }
        }
        return embed;
      });
    await message.channel.send(realmsinfo);
  },
};
