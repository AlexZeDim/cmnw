const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'findAny',
    description: 'This command will find out all twinks for characters',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        const [query, realm_arg] = params;

        let embed = new MessageEmbed();
        let endpoint;
        if (query) {
            endpoint = `http://${process.env.localhost}:3030/api/find/any/${query}`
            if (realm_arg) {
                endpoint = endpoint.concat(`@${realm_arg}`)
            }
            await axios.get(encodeURI(endpoint)).then(({data}) => {
                let { _id, match } = data;
                embed.setTitle(_id.toUpperCase());
                embed.setURL(`https://${process.env.domain}/find/any/${query}`);
                for (let i = 0; i < match.length; i++) {
                    let {guild} = match[i];
                    embed.addField(`┌─────────────┐`, `
                    Name: [${match[i].name}](https://${process.env.domain}/character/${match[i].realm.slug}/${match[i].name})
                    ${("realm" in match[i]) ? `Realm: ${match[i].realm.name}` : ``} 
                    ${("faction" in match[i]) ? `Faction: ${match[i].faction}` : ``} 
                    ${guild ? `Guild: [${guild.name}](https://${process.env.domain}/guild/${match[i].realm.slug}/${guild.slug})` : ``} 
                    ${(guild && typeof guild.rank !== 'undefined') ? `Rank: ${guild.rank === 0 ? 'GM' : `R${guild.rank}`}` : ``} 
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