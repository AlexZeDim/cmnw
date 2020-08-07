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
                for (let i = 0; i < data.length; i++) {
                    if (i === 24 ) {
                        embed.addField(`─────────────`, `
                        Guild 
                        Is
                        Looking
                        For you?
                        [Conglomerat](https://${process.env.domain}/guild/${name}@${realm})
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
        await message.channel.send(guild_logs);
    },
};
