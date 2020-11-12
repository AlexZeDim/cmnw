const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  name: 'glogs',
  description:
    'Search for last 20 events about certain guild in OSINT Logs. Realm transfers are covered. Example usage: `glogs депортация@gordunni ` ',
  aliases: ['guild_logs', 'GLOGS', 'GUILD_LOGS', 'Glogs'],
  args: true,
  async execute(message, args) {
    const id = args;
    const embed = new MessageEmbed();
    await axios.post('http://localhost:4000/graphql', {
      query: `query Guild($id: ID!) {
        guild(id: $id) {
          _id
          name
          realm {
            _id
            slug
            name
          }
          logs {
            type
            original_value
            new_value
            message
            action
            before
            after
          }
        }   
      }`,
      variables: { id },
    }).then(({ data: { data: { guild } } }) => {
      const { logs } = guild;
      if (logs.length) {
        embed.setTitle(`${guild.name}@${guild.realm.slug}`.toString().toUpperCase());
        embed.setURL(`https://${process.env.domain}/guild/${guild._id}`);
        for (let i = 0; i < logs.length; i++) {
          if (i === 14) {
            embed.addField(
              `─────────────`,
              `
                Want 
                More
                To
                Find?
                [Conglomerat]https://${process.env.domain}/guild/${guild._id})
                ─────────────`,
              true,
            );
            break;
          }
          embed.addField(`─────────────`, `Event: ${logs[i].action}
          Message: ${logs[i].message}
          After: ${new Date(logs[i].after).toLocaleString('en-GB')}
          Before: ${new Date(logs[i].before).toLocaleString('en-GB')}
          ─────────────`,
      true,
          );
        }
        embed.setFooter(`OSINT-Logs`);
      }
      return embed;
    });
    await message.channel.send(embed);
  },
};
