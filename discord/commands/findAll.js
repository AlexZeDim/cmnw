const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'findAll',
    description: 'This command will find out all twinks for characters',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        const [query, realm_arg] = params;

        let embed = new MessageEmbed();
        let endpoint;
        if (query) {
            endpoint = `http://${process.env.localhost}:3030/api/findAll/${query}`
            if (realm_arg) {
                endpoint = endpoint.concat(`@${realm_arg}`)
            }
            await axios.get(encodeURI(endpoint)).then(({data}) => {
                let { _id, match } = data;
                embed.setTitle(_id.toUpperCase());
                embed.setURL('https://discord.js.org/');
                for (let i = 0; i < match.length; i++) {
                    let {guild, guild_rank} = match[i];
                    embed.addField(`┌─────────────┐`, `
                    Name: [${match[i].name}](https://discordapp.com)
                    ${("realm" in match[i]) ? `Realm: ${match[i].realm}` : ``} 
                    ${guild ? `Guild: [${guild}](https://discordapp.com)` : ``} 
                    ${guild ? `Rank: ${guild_rank === 0 ? 'GM' : `R${guild_rank}`}` : ``} 
                    ${("faction" in match[i]) ? `Faction: ${match[i].faction}` : ``} 
                    └─────────────┘
                    `, true);
                }
                embed.setFooter(`OSINT-DB`);
                return embed
            });
        }
        await message.channel.send(embed);
    },
};