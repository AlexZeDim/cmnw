const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  name: 'findA',
  description: `Allows you to find no more than 20 (*available*) alternative characters (twinks) in OSINT-DB across different realms. Requires a query parameter, which can be a hash string \`f97efc28\` or a character's name and realm \`блюрателла@гордунни\`
    > Remember, that match by any of this hash values separately doesn't guarantee that a selected character would belong to one identity. It only gives you a certain level of confidence. Also, OSINT-DB doesn't have all the game characters. So if you want a maximum level of confidence, please use **findAll** because only it gives you almost 100% confidence level result.
    
    Usage: \`findA блюрателла@гордунни\``,
  aliases: ['finda', 'FINDA', 'FIND_A', 'find_a', 'Find_A', 'Find_a', 'FindA'],
  cooldown: 10,
  args: true,
  async execute(message, args) {
    const params = args.split('@');
    const [query, realm_arg] = params;

    let embed = new MessageEmbed();
    let endpoint;
    if (query) {
      endpoint = `http://${process.env.localhost}:3030/api/find/a/${query}`;
      if (realm_arg) {
        endpoint = endpoint.concat(`@${realm_arg}`);
      }
      await axios.get(encodeURI(endpoint)).then(({ data }) => {
        let { _id, match } = data;
        embed.setTitle(_id.toUpperCase());
        embed.setURL(`https://${process.env.domain}/find/a/${query}`);
        if (match && match.length) {
          for (let i = 0; i < match.length; i++) {
            if (i === 19) {
              embed.addField(
          `─────────────`,
          `
                  Want 
                  More
                  To
                  Find?
                  [Conglomerat](https://${process.env.domain}/find/a/${query})
                  ─────────────`,
                true,
              );
              break;
            }
            let { guild } = match[i];
            embed.addField(`─────────────`,
              `Name: [${match[i].name}](https://${process.env.domain}/character/${match[i].realm.slug}/${match[i].name})
${'realm' in match[i] ? `Realm: ${match[i].realm.name}` : ``} 
${'faction' in match[i] ? `Faction: ${match[i].faction}` : ``} 
${guild ? `Guild: [${guild.name}](https://${process.env.domain}/guild/${match[i].realm.slug}/${guild.slug})` : ``} 
${guild && typeof guild.rank !== 'undefined' ? `Rank: ${parseInt(guild.rank) === 0 ? 'GM' : `R${guild.rank}`}` : ``} 
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
        embed.setFooter(`OSINT-DB`);
        return embed;
      });
    }
    await message.channel.send(embed);
  },
};
