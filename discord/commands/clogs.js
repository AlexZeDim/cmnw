const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  name: 'clogs',
  description:
    'Search for last 20 events about certain character in OSINT Logs. Like: race, gender, faction change, etc. Realm transfers with rename are not covered. Example usage: `clogs азгримм@soulflayer` ',
  aliases: [
    'character_logs',
    'CLOGS',
    'CHARACTER_LOGS',
    'Character_logs',
    'Clogs',
  ],
  args: true,
  async execute(message, args) {
    const id = args;
    const embed = new MessageEmbed();
    await axios.post('http://localhost:4000/graphql', {
      query: `query Character($id: ID!) {
          character(id: $id) {
            _id
            name
            realm {
              _id
              name
              slug
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
    }).then(({ data: { data: { character } } }) => {
      const { _id, name, realm, logs } = character;
        if (logs.length) {
          embed.setTitle(`${name}@${realm.name}`.toString().toUpperCase());
          embed.setURL(`https://${process.env.domain}/character/${_id}`,);
          for (let i = 0; i < logs.length; i++) {
            if (i === 19) {
              embed.addField(
        `─────────────`,
        `
                Full
                Log
                Available
                At
                [Conglomerat](https://${process.env.domain}/character/${_id})
                ─────────────`,
        true,
              );
              break;
            }
            embed.addField(
        `─────────────`,
        `
              Event: ${logs[i].action}
              Message: ${logs[i].message}
              After: ${new Date(logs[i].after).toLocaleString('en-GB')}
              Before: ${new Date(logs[i].before).toLocaleString('en-GB')}
              ─────────────`,
              true,
            );
          }
          embed.setFooter(`OSINT-Logs`);
        }
      });
    await message.channel.send(embed);
  },
};
