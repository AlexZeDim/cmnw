const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'clogs',
    description: 'Search for selected character in OSINT Logs ',
    args: true,
    async execute(message, args) {
        const [name, realm] = args.split('@');
        let embed = new MessageEmbed();
        let character_logs = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/characters/character_logs/${name}@${realm}`)).then(({data}) => {
            if (data.length) {
                embed.setTitle((`${name}@${realm}`).toString().toUpperCase());
                embed.setURL(`https://${process.env.domain}/character/${name}@${realm}`);
                for (let i = 0; i < data.length; i++) {
                    if (i === 24 ) {
                        embed.addField(`─────────────`, `
                        Full
                        Log
                        Available
                        At
                        [Conglomerat](https://${process.env.domain}/character/${name}@${realm})
                        ─────────────
                        `, true);
                        break
                    }
                    embed.addField(`─────────────`, `
                    Event: ${data[i].action}
                    From: ${data[i].original_value}
                    To: ${data[i].new_value}
                    After: ${data[i].after}
                    Before: ${data[i].before}
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
