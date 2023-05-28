import { MessageEmbed } from 'discord.js';
import { discordConfig } from '@app/configuration';
import { CharacterDto } from '@app/core';

export function HashEmbedMessage(args: string, characters: Partial<CharacterDto[]>): MessageEmbed {
  const embed = new MessageEmbed();
  try {

    const query_hash = args.trim().toUpperCase();

    embed.setTitle(query_hash);
    embed.setURL(encodeURI(`${discordConfig.basename}/hash/${query_hash}`));

    console.log(characters);

    if (characters && characters.length) {
      characters.map((character, i) => {
        if (i === 19) {
          embed.addField(
            '─────────────',
            `
                      Want 
                      More
                      To
                      Find?
                      [Commonwealth](${discordConfig.basename}/hash/${query_hash})
                      ─────────────`,
            true,
          );
          return;
        }

        embed.addField('─────────────',
          `Name: [${characters[i].name}](${discordConfig.basename}/character/${characters[i]._id})
    ${characters[i].realm_name ? `Realm: ${characters[i].realm_name}` : ''} 
    ${characters[i].faction ? `Faction: ${characters[i].faction}` : ''} 
    ${characters[i].guild && characters[i].guild_id ? `Guild: [${characters[i].guild}](${discordConfig.basename}/guild/${characters[i].guild_id})` : ''} 
    ${typeof characters[i].guild_rank !== 'undefined' ? `Rank: ${characters[i].guild_rank === 0 ? 'GM' : `R${characters[i].guild_rank}`}` : ''} 
     ─────────────`,
          true,
        );
      });
    } else {
      embed.addField(
        '─────────────',
        `
No match found
─────────────
`,
      );
    }

    return embed;
  } catch (errorException) {
    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell the @AlexZeDim2645 that there is an error in HashEmbedMessage', false);
    embed.setThumbnail('https://i.imgur.com/vraz5ML.png');
    return embed;
  }
}
