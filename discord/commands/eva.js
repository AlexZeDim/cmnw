const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'eva',
    description: 'PH',
    args: true,
    async execute(message, args) {
        const [item, realm] = args.split('@');
        let embed = new MessageEmbed();
        let valuation = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/eva/${item}@${realm}`)).then(({data}) => {
            let {
                item,
                realm,
                valuations
            } = data;
            embed.setAuthor(`${item.name.en_GB}@${realm.name}`.toUpperCase(), '', encodeURI(`https://${process.env.domain}/item/${realm.slug}/${item.name.en_GB}`));

            let descriptionString = '';
            let market_counter = 0;
            let derivative_counter = 0;
            let premium_counter = 0;

            embed.setURL(encodeURI(`https://${process.env.domain}/item/${realm.slug}/${item.name.en_GB}`));
            if ("icon" in item) {
                embed.setThumbnail(item.icon);
            }

            for (let valuation of valuations) {
                if (valuation.type === "MARKET") {
                    if (valuation.details && valuation.details.orders && valuation.details.orders.length) {
                        market_counter = valuation.details.orders.length
                    }
                }
                if (valuation.type === "DERIVATIVE") {
                    derivative_counter += 1;
                }

                if (valuation.type === "PREMIUM") {
                    premium_counter += 1;
                }

                embed.addField(`┌─────────────┐`, `
                    Name: ${valuation.name}
                    Type: ${valuation.type}
                    Value: ${valuation.value}
                    └─────────────┘
                    `, true);
            }

            if (derivative_counter) {
                descriptionString = descriptionString.concat(`*Derivative pricing is based on ${derivative_counter} ${derivative_counter === 1 ? 'method' : 'methods'}*\n _ _`)
            }

            if (premium_counter) {
                descriptionString = descriptionString.concat(`*Premium pricing is based on ${premium_counter} ${premium_counter === 1 ? 'method' : 'methods'}*\n _ _`)
            }

            if (market_counter) {
                descriptionString = descriptionString.concat(`*Market pricing is based on ${market_counter} ${market_counter === 1 ? 'order' : 'orders'}*\n _ _`)
            }

            embed.setDescription(descriptionString);
            embed.setTimestamp(realm.auctions);
            embed.setFooter(`DMA-XVA`);
            return embed
        });
        await message.channel.send(valuation);
    },
};