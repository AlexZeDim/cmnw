const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  name: 'hash',
  description: `Allows you to find no more than 20 (*available*) alternative characters (twinks) in OSINT-DB across different realms. Requires a query parameter, which can be a hash string \`f97efc28\`
    > Remember, that match by any of this hash values separately doesn't guarantee that a selected character would belong to one identity. It only gives you a certain level of confidence.
    
    Usage: \`hash a@f97efc28\``,
  aliases: ['Hash', 'HASH' ],
  cooldown: 10,
  args: true,
  async execute(message, args) {
    const query_hash = args;
    const embed = new MessageEmbed();
    await axios.post('http://localhost:4000/graphql', {
      query: `query Hash($query_hash: String!) {
      hash(query: $query_hash) {
          _id
          name
          realm {
            name
          }
          guild {
            name
            slug
          }
          faction
      } 
    }`,
      variables: { query_hash },
    }).then(({ data: { data: { hash } } }) => {
        embed.setTitle(query_hash.toUpperCase());
        embed.setURL(`https://${process.env.domain}/hash/${query_hash}`);
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
            const { guild } = hash[i];
            embed.addField(`─────────────`,
              `Name: [${hash[i].name}](https://${process.env.domain}/character/${hash[i]._id})
${'realm' in hash[i] ? `Realm: ${hash[i].realm.name}` : ``} 
${'faction' in hash[i] ? `Faction: ${hash[i].faction}` : ``} 
${guild ? `Guild: [${guild.name}](https://${process.env.domain}/guild/${guild.slug}@${hash[i].realm.slug})` : ``} 
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
      });
    await message.channel.send(embed);
  },
};
