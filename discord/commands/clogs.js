const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'clogs',
    description: 'Search for last 20 events about certain character in OSINT Logs. Like: race, gender, faction change, etc. Realm transfers with rename are not covered. Example usage: \`clogs азгримм@soulflayer \` ',
    aliases: ['character_logs', 'CLOGS', 'CHARACTER_LOGS'],
    args: true,
    async execute(message, args) {
        const [name, realm] = args.split('@');
        let embed = new MessageEmbed();
        let character_logs = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/characters/character_logs/${name}@${realm}`)).then(({data}) => {
            if (data.length) {
                embed.setTitle((`${name}@${realm}`).toString().toUpperCase());
                embed.setURL(`https://${process.env.domain}/character/${realm}/${name}`);
                for (let i = 0; i < data.length; i++) {
                    if (i === 19 ) {
                        embed.addField(`─────────────`, `
                        Full
                        Log
                        Available
                        At
                        [Conglomerat](https://${process.env.domain}/character/${realm}/${name})
                        ─────────────
                        `, true);
                        break
                    }
                    embed.addField(`─────────────`, `
                    Event: ${data[i].action}
                    Message: ${data[i].message}
                    After: ${new Date(data[i].after).toLocaleString('en-GB')}
                    Before: ${new Date(data[i].before).toLocaleString('en-GB')}
                    ─────────────
                    `, true);
                }
                embed.setFooter(`OSINT-Logs`);
            }
            return embed
        });
        await message.channel.send(character_logs);
    },
};
