import { MessageEmbed } from "discord.js";
import { FACTION } from '@app/core';

export async function CharacterEmbedMessage(character: any): Promise<MessageEmbed> {
  const embed = new MessageEmbed();
  try {
    if (character.guild) {
      let guild: string = character.guild;
      if (character.guild_rank && parseInt(character.guild_rank) === 0)  {
        guild = guild.concat(' // GM')
      } else if (character.guild_rank) {
        guild = guild.concat(` // R${character.guild_rank}`)
      }
      embed.setTitle(guild);
      // TODO embed.setURL(encodeURI(`https://${process.env.domain}/guild/${guild.slug}@${realm.slug}`));
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
    return embed;
  } catch (e) {
    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell the @AlexZeDim2645 that there is an error in CharacterEmbedMessage', false);
    embed.setThumbnail('https://cdn.discordapp.com/avatars/240464611562881024/d266faef37db5f6de78cf2fd687634d0.png?size=128')
    return embed;
  }
}
