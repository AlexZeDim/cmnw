const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'findAll',
    description: `In result this command will return first 20 matches between all the hash value for the selected character. This is a maximum level confidence match and it requires only character name and realm as argument.
    Example usage: \`findAll блюрателла@гордунни\``,
    aliases: ['FindAll', 'FINDALL', 'find_all', 'find_All', 'Find_All', 'findall'],
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        const [query, realm_arg] = params;

        let embed = new MessageEmbed();
        let endpoint;
        if (query) {
            endpoint = `http://${process.env.localhost}:3030/api/find/all/${query}`
            if (realm_arg) {
                endpoint = endpoint.concat(`@${realm_arg}`)
            }
            await axios.get(encodeURI(endpoint)).then(({data}) => {
                let { _id, match } = data;
                embed.setTitle(_id.toUpperCase());
                embed.setURL(`https://${process.env.domain}/find/and/${query}`);
                if (match && match.length) {
                    for (let i = 0; i < match.length; i++) {
                        if (i === 19 ) {
                            embed.addField(`─────────────`, `
                                Want 
                                More
                                To
                                Find?
                                [Conglomerat](https://${process.env.domain}/find/and/${query})
                                ─────────────
                                `, true);
                                break
                            }
                        let {guild} = match[i];
                        embed.addField(`─────────────`, `
                            Name: [${match[i].name}](https://${process.env.domain}/character/${match[i].realm.slug}/${match[i].name})
                            ${("realm" in match[i]) ? `Realm: ${match[i].realm.name}` : ``} 
                            ${("faction" in match[i]) ? `Faction: ${match[i].faction}` : ``} 
                            ${guild ? `Guild: [${guild.name}](https://${process.env.domain}/guild/${match[i].realm.slug}/${guild.slug})` : ``} 
                            ${(guild && typeof guild.rank !== 'undefined') ? `Rank: ${parseInt(guild.rank) === 0 ? 'GM' : `R${guild.rank}`}` : ``} 
                            ─────────────
                            `, true);
                    }
                } else {
                    embed.addField(`─────────────`, `
                    No match found
                    ─────────────
                    `);
                }
                embed.setFooter(`OSINT-DB`);
                return embed
            });
        }
        await message.channel.send(embed);
    },
};