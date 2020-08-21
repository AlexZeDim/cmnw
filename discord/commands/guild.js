const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const humanizeString = require('humanize-string');
require('dotenv').config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: 'guild',
  description:
    'Return information about specific guild. Example usage: `guild депортация@гордунни`',
  aliases: ['GUILD', 'Guild'],
  args: true,
  async execute(message, args) {
    const [name, realm] = args.split('@');
    let embed = new MessageEmbed();
    let guild = await axios
      .get(
        encodeURI(
          `http://${process.env.localhost}:3030/api/guilds/guild/${name}@${realm}`,
        ),
      )
      .then(({ data }) => {
        let { _id, name, realm, members } = data;
        embed.setAuthor(
          `${(name + '@' + realm.name).toUpperCase()}`,
          '',
          encodeURI(
            `https://${process.env.domain}/guild/${realm.slug}/${name}`,
          ),
        );

        const fieldsToCheck = [
          'id',
          'achievement_points',
          'faction',
          'member_count',
          'lastModified',
          'createdBy',
        ];

        fieldsToCheck.map(field => {
          if (field in data) {
            if (typeof data[field] === 'object') {
              Object.entries(data[field]).map(([k, v]) => {
                embed.addField(
                  `${humanizeString(field)} ${humanizeString(k)}`,
                  v,
                  true,
                );
              });
            } else {
              if (field === 'faction') {
                if (data[field] === 'Alliance') {
                  embed.setColor('#006aff');
                } else if (data[field] === 'Horde') {
                  embed.setColor('#ff0000');
                }
              } else if (field === 'lastModified') {
                embed.setTimestamp(data[field]);
              } else if (field === 'createdBy') {
                embed.setFooter(`${data[field]}`);
              } else {
                embed.addField(humanizeString(field), data[field], true);
              }
            }
          }
        });
        if (members && members.length) {
          members = members.filter(member => member.guild.rank < 2);
          for (let i = 0; i < members.length; i++) {
            if (i === 9) {
              embed.addField(
                `─────────────`,
                `
                            Want Full Roster?
                            Check [Conglomerat](https://${
                              process.env.domain
                            }/guild/${realm.slug}/${_id.split('@')[0]})
                            ─────────────
                            `,
                true,
              );
              break;
            }
            embed.addField(
              `─────────────`,
              `
                        ID: [${members[i]._id}](https://${
                process.env.domain
              }/character/${realm.slug}/${members[i].name})
                        R: ${
                          members[i].guild.rank === 0
                            ? 'GM'
                            : members[i].guild.rank
                        }
                        ─────────────
                        `,
              true,
            );
          }
        }
        return embed;
      });
    await message.channel.send(guild);
  },
};
