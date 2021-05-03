import { MessageEmbed } from 'discord.js';
import axios from 'axios';
import { FACTION } from '@app/core';

module.exports = {
  name: 'character',
  description:
    'Return information about specific character. Example usage: `character блюрателла@гордунни`',
  aliases: ['char', 'CHAR', 'CHARACTER', 'Char', 'Character'],
  args: true,
  async execute(message, args) {
    const id = args;
    const embed = new MessageEmbed();
    const { data: character } = await axios.get(encodeURI(`http://localhost:5000/api/osint/character?_id=${id}`));
    if (character.guild) {
      let guild: string = character.guild;
      if (character.guild_rank && parseInt(character.guild_rank) === 0)  {
        guild = guild.concat(' // GM')
      } else if (character.guild_rank) {
        guild = guild.concat(` // R${character.guild_rank}`)
      }
      embed.setTitle(guild);
      // embed.setURL(encodeURI(`https://${process.env.domain}/guild/${guild.slug}@${realm.slug}`));
    }
    embed.setAuthor(character._id.toUpperCase());
    if (character.id) embed.addField('ID', character.id, true);
    if (character.character_class) embed.addField('Class', character.character_class, true);
    if (character.active_spec) embed.addField('Active Spec', character.active_spec, true);
    if (character.level) embed.addField('Level', character.level, true);
    if (character.faction) {
      if (character.faction === FACTION.A) {
        embed.setColor('#006aff');
      }
      if (character.faction === FACTION.H) {
        embed.setColor('#ff0000');
      }
      embed.addField('Faction', character.faction, true);
    }
    if (character.race && character.gender) embed.addField('Race & Gender', `${character.race} // ${character.gender}`, true);
    if (character.hash_a) embed.addField('Hash A', character.hash_a, true);
    if (character.hash_b) embed.addField('Hash B', character.hash_b, true);
    if (character.hash_f) embed.addField('Hash A', character.hash_f, true);
    if (character.chosen_covenant && character.renown_level) embed.addField('Covenant', `${character.chosen_covenant} // ${character.renown_level}`, true);
    if (character.average_item_level && character.equipped_item_level) embed.addField('Item Level', `${character.equipped_item_level} // ${character.average_item_level}`, true);
    if (character.professions && character.professions.length) {
      embed.addField('Professions', character.professions.filter(profession => profession.tier === 'Primary').map(profession => profession.name).join(' // '), true);
    }
    if (character.avatar) embed.setThumbnail(character.avatar);
    if (character.last_modified) embed.setTimestamp(character.last_modified);
    if (character.created_by) embed.setFooter(`${character.created_by} | Gonikon`);
    await message.channel.send(embed);
  }
}
