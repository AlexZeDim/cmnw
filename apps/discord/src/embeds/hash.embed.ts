import { MessageEmbed } from "discord.js";

export function HashEmbedMessage(args: string, hash: any): MessageEmbed {
  const embed = new MessageEmbed();
  try {
    const query_hash = args.trim().toUpperCase();
    embed.setTitle(query_hash);
    // TODO embed.setURL(`https://${process.env.domain}/hash/${query_hash}`);
    if (hash && hash.length) {
      for (let i = 0; i < hash.length; i++) {
        if (i === 19) {
          embed.addField(
            `─────────────`,
            `
                    Want 
                    More
                    To
                    Find?
                    [Conglomerat](https://${process.env.domain}/hash/${query_hash})
                    ─────────────`,
            true,
          );
          break;
        }
        embed.addField(`─────────────`,
          `Name: [${hash[i].name}](https://${process.env.domain}/character/${hash[i]._id})
  ${hash[i].realm_name ? `Realm: ${hash[i].realm_name}` : ``} 
  ${hash[i].faction ? `Faction: ${hash[i].faction}` : ``} 
  ${hash[i].guild && hash[i].guild_id ? `Guild: [${hash[i].guild}](https://${process.env.domain}/guild/${hash[i].guild_id})` : ``} 
  ${typeof hash[i].guild_rank !== 'undefined' ? `Rank: ${parseInt(hash[i].guild_rank) === 0 ? 'GM' : `R${hash[i].guild_rank}`}` : ``} 
   ─────────────`,
          true,
        );
      }
    } else {
      embed.addField(
        `─────────────`,
        `
No match found
─────────────
`,
      );
    }
    return embed
  } catch (e) {
    embed.setAuthor('Oops, sorry!');
    embed.addField('Error', 'Tell the @AlexZeDim2645 that there is an error in HashEmbedMessage', false);
    embed.setThumbnail('https://cdn.discordapp.com/avatars/240464611562881024/d266faef37db5f6de78cf2fd687634d0.png?size=128')
  }
}
