import { MessageEmbed } from "discord.js";
import { Character } from '@app/mongo';
import { capitalize, FACTION } from '@app/core';
import { LeanDocument } from 'mongoose';
import { discordConfig } from '@app/configuration';

export function CandidateEmbedMessage(character: LeanDocument<Character>): MessageEmbed {
  const embed = new MessageEmbed();
  try {
    const realm_title: string = character.realm_name;

    embed.setAuthor(
      `${character.name}@${realm_title}`.toUpperCase(),
      undefined,
      encodeURI(`${discordConfig.basename}/character/${character._id}`)
    );

    embed.setDescription(`:page_with_curl: [WCL](https://www.warcraftlogs.com/character/eu/${character.realm}/${character.name}) :speech_left: [WP](https://www.wowprogress.com/character/eu/${character.realm}/${character.name}) :key: [RIO](https://raider.io/characters/eu/${character.realm}/${character.name})\n`)
    embed.setFooter(`WOWPROGRESS | CMNW`);

    if (character.guild) {
      let guild: string = character.guild;
      if (character.guild_rank && character.guild_rank === 0)  {
        embed.setTitle(`${guild} | GM`);
      } else if (character.guild_rank) {
        embed.setTitle(`${guild} | R${character.guild_rank}`);
      }
      embed.setURL(encodeURI(`${discordConfig.basename}/guild/${character.guild}@${character.realm}`));
    }

    if (character.faction) {
      if (character.faction === FACTION.A) {
        embed.setColor('#006aff');
      }
      if (character.faction === FACTION.H) {
        embed.setColor('#ff0000');
      }
      embed.addField('Faction', character.faction, true);
    }

    if (character.avatar) embed.setThumbnail(character.avatar);
    if (character.last_modified) embed.setTimestamp(character.last_modified);
    if (character.average_item_level && character.equipped_item_level) embed.addField('Item Level', `${character.equipped_item_level} || ${character.average_item_level}`, true);
    if (character.character_class) embed.addField('Class', character.character_class, true);
    if (character.active_spec) embed.addField('Active Spec', character.active_spec, true);
    if (character.hash_a) embed.addField('Hash A', character.hash_a, true);
    if (character.hash_b) embed.addField('Hash B', character.hash_b, true);
    if (character.chosen_covenant && character.renown_level) embed.addField('Covenant', `${character.chosen_covenant} || ${character.renown_level}`, true);
    if (character.role) embed.addField('Role', character.role.toString().replace(/\./g, '\n').toUpperCase(), true);
    if (character.rio_score) embed.addField('RIO', character.rio_score.toString(), true);
    if (character.languages) embed.addField('Language', character.languages.toString(), true);
    if (character.wcl_percentile) embed.addField('WCL Best.Perf.Avg', `${character.wcl_percentile} Mythic`, true);
    if (character.days_from && character.days_to) embed.addField('RT days', `${character.days_from} - ${character.days_to}`, true);
    if (character.battle_tag) embed.addField('Battle.tag', character.battle_tag, true);

    if (character.transfer) {
      embed.addField('Transfer', `:white_check_mark:`, true);
    } else {
      embed.addField('Transfer', `:x:`, true);
    }

    if (character.raid_progress.length) {
      character.raid_progress.map((raid) => {
        embed.addField(capitalize(raid._id), raid.progress, true);
      })
    }

    return embed;
  } catch (errorException) {
    return embed;
  }
}
