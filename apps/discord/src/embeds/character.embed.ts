import { MessageEmbed } from "discord.js";
import { CharacterDto, FACTION } from '@app/core';
import { discordConfig } from '@app/configuration';

export function CharacterEmbedMessage(character: Partial<CharacterDto>): MessageEmbed {
  const embed = new MessageEmbed();

  try {

    embed.setAuthor(
      character._id.toUpperCase(),
      undefined,
      encodeURI(`${discordConfig.basename}/character/${character._id}`)
    );

    if (character.guild) {
      let guild: string = character.guild;
      if (character.guild_rank && character.guild_rank === 0)  {
        embed.setTitle(`${guild} | GM`);
      } else if (character.guild_rank) {
        embed.setTitle(`${guild} | R${character.guild_rank}`);
      }
      embed.setURL(encodeURI(`${discordConfig.basename}/guild/${character.guild}@${character.realm}`));
    }

    if (character.id) embed.addField('ID', String(character.id), true);
    if (character.level) embed.addField('Level', String(character.level), true);

    if (character.character_class) {
      if (character.active_spec) {
        embed.addField('Class & Spec', `${character.character_class} | ${character.active_spec}`, true);
      } else {
        embed.addField('Class & Spec', character.character_class, true);
      }
    }

    if (character.hash_a) {
      const hash = character.hash_a.replace(/(.{4})/g, '$1 ');
      embed.addField('Hash A', `[${hash}](${discordConfig.basename}/hash/a@${character.hash_a})`, true);
    }
    if (character.hash_b) {
      const hash = character.hash_b.replace(/(.{4})/g, '$1 ');
      embed.addField('Hash B', `[${hash}](${discordConfig.basename}/hash/b@${character.hash_b})`, true);
    }
    if (character.hash_f) {
      embed.addField('Hash F', character.hash_f, true);
    }

    if (character.race && character.gender) embed.addField('Race & Gender', `${character.race} | ${character.gender}`, true);

    if (character.faction) {
      if (character.faction === FACTION.A) embed.setColor('#006aff');
      if (character.faction === FACTION.H) embed.setColor('#ff0000');
      embed.addField('Faction', character.faction, true);
    }

    if (character.chosen_covenant && character.renown_level) embed.addField('Covenant', `${character.chosen_covenant} | ${character.renown_level}`, true);
    if (character.average_item_level && character.equipped_item_level) embed.addField('Item Level', `${character.equipped_item_level} | ${character.average_item_level}`, true);

    if (character.professions && character.professions.length) {
      embed.addField('Professions', character.professions.filter(profession => profession.tier === 'Primary').map(profession => profession.name).join(' | '), true);
    }

    if (character.avatar) embed.setThumbnail(character.avatar);
    if (character.last_modified) embed.setTimestamp(character.last_modified);
    if (character.created_by) embed.setFooter(`${character.created_by}`);

    return embed;
  } catch (errorException) {
    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell the @AlexZeDim2645 that there is an error in CharacterEmbedMessage', false);
    embed.setThumbnail('https://i.imgur.com/vraz5ML.png');
    return embed;
  }
}
