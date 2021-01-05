const { MessageEmbed } = require('discord.js');
const axios = require('axios');
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
              _id
              name
              rank
            }
            average_item_level
            equipped_item_level
            hash_a
            hash_b
            hash_f
            race
            character_class
            active_spec
            gender
            faction
            level
            lastModified
            chosen_covenant
            renown_level
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
      const { _id, name, guild, realm } = character;
      if (guild) {
        const guild_string = {};
        guild_string.name = guild.name.toString().toUpperCase();
        if (typeof guild.rank !== 'undefined') {
          if (parseInt(guild.rank) === 0) {
            guild_string.rank = ` // GM`
          } else {
            guild_string.rank = ` // R${guild.rank}`
          }
        }

        embed.setTitle(`${guild_string.name}${(guild_string.rank) ? (guild_string.rank) : ('')}`);
        embed.setURL(encodeURI(`https://${process.env.domain}/guild/${guild.slug}@${realm.slug}`));
      }
      if (_id) embed.setAuthor(_id.toUpperCase(), '', encodeURI(`https://${process.env.domain}/character/${name}@${realm.slug}`));
      if (character.id) embed.addField('ID',character.id, true);
      if (character.character_class) embed.addField('Class', character.character_class, true);
      if (character.active_spec) embed.addField('Active Spec', character.active_spec, true);
      if (character.level) embed.addField('Level', character.level, true);
      if (character.faction) {
        if (character.faction === 'Alliance') {
          embed.setColor('#006aff');
        }
        if (character.faction === 'Horde') {
          embed.setColor('#ff0000');
        }
        embed.addField('Faction', character.faction, true);
      }
      if (character.race && character.gender) embed.addField('Race & Gender', `${character.race} // ${character.gender}`, true);
      if (character.hash_a) embed.addField('Hash A', `[${character.hash_a}](https://${process.env.domain}/hash/a@${character.hash_a})`, true);
      if (character.hash_b) embed.addField('Hash B', `[${character.hash_b}](https://${process.env.domain}/hash/b@${character.hash_b})`, true);
      if (character.hash_f) embed.addField('Hash F', `[${character.hash_f}](https://${process.env.domain}/hash/f@${character.hash_f})`, true);
      if (character.chosen_covenant && character.renown_level) embed.addField('Covenant', `${character.chosen_covenant} // ${character.renown_level}`, true);
      if (character.average_item_level && character.equipped_item_level) embed.addField('Item Level', `${character.equipped_item_level} // ${character.average_item_level}`, true);
      if (character.media && character.media.avatar_url()) embed.setThumbnail(character.media.avatar_url.toString());
      if (character.lastModified) embed.setTimestamp(character.lastModified);
      if (character.createdBy) embed.setFooter(`${character.createdBy} | Gonikon`);
    });
    await message.channel.send(embed);
  },
};
