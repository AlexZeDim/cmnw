const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'glogs',
    description: 'Search for selected guild in OSINT Logs ',
    args: true,
    async execute(message, args) {
        const [name, realm] = args.split('@');
        let embed = new MessageEmbed();
        let guild_logs = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/guilds/guild_logs/${name}@${realm}`)).then(({data}) => {
            if (data.length) {
                embed.setTitle((`${name}@${realm}`).toString().toUpperCase());
                embed.setURL(`https://${process.env.domain}/guild/${name}@${realm}`);
                data.sort((a,b) => {
                    return new Date(a.before) - new Date(b.before)
                })
                for (let i = 0; i < 29; i++) {
                    embed.addField(`─────────────`, `
                    Event: ${data[i].action}
                    From: ${data[i].original_value}
                    To: ${data[i].new_value}
                    After: ${data[i].after}
                    Before: ${data[i].before}
                    ─────────────
                    `, true);
                }
            }
            embed.setFooter(`OSINT-Logs`);
            return embed
        });
        await message.channel.send(guild_logs);
    },
};
