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
    const id = args;
    const embed = new MessageEmbed();
    await axios.post('http://localhost:4000/graphql', {
      query: `query Guild($id: ID!) {
        guild(id: $id) {
          _id
          id
          name
          realm {
            _id
            slug
            name
            name_locale
          }
          faction
          members {
            _id
            name
            realm {
              _id
              name
              slug
            }
            guild {
              name
              slug
              rank
            }
          }
          member_count
          achievement_points
          lastModified
          updatedBy
        }   
      }`,
      variables: { id },
    }).then(({ data: { data: { guild } } }) => {
      const { name, realm, members } = guild;
      embed.setAuthor(`${(name + '@' + realm.name).toUpperCase()}`, '', encodeURI(`https://${process.env.domain}/guild/${guild._id}`));

      if (guild.id) {
        embed.addField(`ID`, guild.id, true);
      }

      if (guild.achievement_points) {
        embed.addField(`Achievement Points`, guild.achievement_points, true);
      }

      if (guild.faction === 'Alliance') {
        embed.setColor('#006aff');
      } else if (guild.faction === 'Horde') {
        embed.setColor('#ff0000');
      }

      if (guild.member_count) {
        embed.addField(`Members`, guild.member_count, true);
      }

      if (guild.lastModified) {
        embed.setTimestamp(guild.lastModified);
      }

      if (guild.updatedBy) {
        embed.setFooter(guild.updatedBy);
      }

      if (members && members.length) {
        members.sort((a, b) => a.guild.rank - b.guild.rank);
        for (let i = 0; i < members.length; i++) {
          if (i === 8) {
            embed.addField(
      `─────────────`,
      `
              Want Full Roster?
              Check [Conglomerat](https://${process.env.domain}/guild/${guild._id})
              ────────────`,
        true,
            );
            break;
          }
          embed.addField(
    `────── R: ${members[i].guild.rank === 0 ? ('GM ') : (`${members[i].guild.rank} ──`)}────`,
    `[${members[i].name}@${members[i].realm.name}](https://${process.env.domain}/character/${members[i]._id}) 
            ──────────────`,
          true,
          );
        }
      }
      return embed;
    });
    await message.channel.send(embed);
  },
};
