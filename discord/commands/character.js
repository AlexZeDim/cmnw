const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const humanizeString = require('humanize-string');
require('dotenv').config();

/***
 * @type {{args: boolean, name: string, description: string, execute(*, *): Promise<void>}}
 */
module.exports = {
  name: 'character',
  description:
    'Return information about specific character. Example usage: `character блюрателла@гордунни`',
  aliases: ['char', 'CHAR', 'CHARACTER', 'Char', 'Character'],
  args: true,
  async execute(message, args) {
    const id = args;
    const embed = new MessageEmbed();
    await axios.post('http://localhost:4000/graphql', {
        query: `query Character($id: ID!) {
          character(id: $id) {
            _id
            id
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
            ilvl {
              eq
              avg
            }
            hash {
              a
              b
              c
              ex
              t
            }
            race
            character_class
            spec
            gender
            faction
            level
            lastModified
            media {
              avatar_url
              bust_url
              render_url
            }
            createdBy
            createdAt
            updatedBy
            updatedAt
          }  
        }`,
        variables: { id },
      }).then(({ data: { data: { character } } }) => {
      let _id, name, guild, realm;
      ({ _id, name, guild, realm } = character);
      if (guild) {
        let guild_string = guild.name.toString().toUpperCase();
        if (guild.rank) {
          guild_string = guild_string.concat(` // ${guild.rank === 0 ? 'GM' : 'R' + guild.rank}`);
        }
        embed.setTitle(guild_string);
        embed.setURL(encodeURI(`https://${process.env.domain}/guild/${guild.slug}@${realm.slug}`));
      }
      if (_id) {
        embed.setAuthor(_id.toUpperCase(), '', encodeURI(`https://${process.env.domain}/character/${name}@${realm.slug}`));
      }

      const fieldsToCheck = [
        'id',
        'character_class',
        'spec',
        'level',
        'hash',
        'ilvl',
        'faction',
        'media',
        'race',
        'gender',
        'lastModified',
        'createdBy',
      ];

      fieldsToCheck.forEach(field => {
        if (typeof character[field] === 'object' && character[field] !== null) {
          if (field === 'hash') {
            delete character[field].t;
            Object.entries(character[field]).forEach(([k, v]) => {
              embed.addField(`${humanizeString(field)} ${humanizeString(k)}`, `[${v}](https://${process.env.domain}/hash/${k}@${v})`, true);
            });
          } else if (field === 'media') {
            embed.setThumbnail(character[field].avatar_url);
          } else {
            Object.entries(character[field]).forEach(([k, v]) => {
              if (v !== null) embed.addField(`${humanizeString(field)} ${humanizeString(k)}`, v, true);
            });
          }
        } else {
          if (field === 'faction') {
            if (character[field] === 'Alliance') {
              embed.setColor('#006aff');
            } else if (character[field] === 'Horde') {
              embed.setColor('#ff0000');
            }
          } else if (field === 'lastModified') {
            embed.setTimestamp(character[field]);
          } else if (field === 'createdBy') {
            embed.setFooter(`${character[field]} | Gonikon`);
          } else {
            embed.addField(humanizeString(field.replace('character_', '')), character[field], true);
          }
        }
      });
    });
    await message.channel.send(embed);
  },
};
