const { MessageEmbed } = require('discord.js');
const axios = require('axios');
const humanizeString = require('humanize-string');
require('dotenv').config();

module.exports = {
    name: 'contracts',
    description: 'Returns a min, avg, max price and quantity for the certain item on requested tenor. Example usage: \`contracts tod zntd@gordunni\` ',
    aliases: ['Contracts', 'CONTRACTS', 'contract', 'Contract', 'CONTRACT'],
    args: true,
    async execute(message, args) {
        let embed = new MessageEmbed();
        const checkTenor = ['tod', 'ytd', 'last_week', 'week', 'last_month', 'month']
        const [tenor, query] = args.split(' ');
        if (checkTenor.includes(tenor) && query) {
            const [name, realm] = args.split('@');
            let contracts = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/contracts/${tenor}/${name}@${realm}`)).then(({data}) => {
                let { item, realm, snapshot, contracts } = data;
                embed.setAuthor(`${item.name.en_GB}@${realm.name}`.toUpperCase(), '', encodeURI(`https://${process.env.domain}/contracts/${realm.slug}/${item._id}/${tenor}`));

                if ("icon" in item) {
                    embed.setThumbnail(item.icon);
                }

                for (const [k, v] of Object.entries(snapshot)) {
                    embed.addField(humanizeString(k), parseFloat(v.toFixed(2)), true);
                }

                if (contracts.length) {
                    embed.setDescription(`Item data is based on ${contracts.length} contracts`);
                }

                embed.setTimestamp(realm.auctions)
                embed.setFooter(`DMA-Contracts`);
                return embed
            });
            await message.channel.send(contracts);
        }
    },
};
