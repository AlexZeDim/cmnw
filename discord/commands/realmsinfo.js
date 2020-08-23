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
          for (let i = 0; i < data.length; i++) {
            let name_locale, characters_total,
              characters_alliance, characters_horde, characters_max_level,
              characters_unique, guilds_total, guilds_alliance, guilds_horde;
            if (data[i].name_locale) {
              name_locale = data[i].name_locale
            } else {
              name_locale = data[i].name
            }
            if (data[i].players) {
              characters_total = data[i].players.total
              characters_alliance = data[i].players.alliance
              characters_horde = data[i].players.horde
              characters_max_level = data[i].players.max_level
              characters_unique =  data[i].players.unique
            }
            if (data[i].guilds) {
              guilds_total = data[i].guilds.total
              guilds_alliance = data[i].guilds.alliance
              guilds_horde = data[i].guilds.horde
            }
            if (i === 5) {
              embed.addField(
                `─────────────`,
                `
                      Check
                      Full
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
                  Type: ${name_locale}
                  Locale: ${data[i].locale}
                  ──────
                  **Characters**
                  ──────
                  Total: ${characters_total}
                  Alliance: ${characters_alliance}
                  Horde: ${characters_horde}
                  Max Level: ${characters_max_level}
                  Unique: ${characters_unique}
                  ──────
                  **Guilds**
                  ──────
                  Total: ${guilds_total}
                  Alliance: ${guilds_alliance}
                  Horde: ${guilds_horde}
                  ─────────────
                  `,
              true,
            );
          }
        }
        return embed;
      });
    await message.channel.send(realmsinfo);
  },
};
