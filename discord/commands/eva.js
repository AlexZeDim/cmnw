const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'eva',
    description: `This command shows the 30 cheapest valuation for any item available in the game, based on it's asset class.`,
    args: true,
    async execute(message, args) {
        const [item, realm] = args.split('@');
        let embed = new MessageEmbed();
        let valuation = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/items/eva/${item}@${realm}`)).then(({data}) => {
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

            for (let i = 0; i < valuations.length; i++) {
                if (i === 24 ) {
                    embed.addField(`─────────────`, `
                        Full Log Avaliable
                        Pricing
                        Available
                        At
                        [Conglomerat](https://${process.env.domain}/item/${realm.slug}/${item.name.en_GB})
                        ─────────────
                        `, true);
                    break
                }
                if (valuations[i].type === "MARKET") {
                    if (valuations[i].details && valuations[i].details.orders && valuations[i].details.orders.length) {
                        market_counter = valuations[i].details.orders.length
                    }
                }
                if (valuations[i].type === "DERIVATIVE") {
                    derivative_counter += 1;
                }

                if (valuations[i].type === "PREMIUM") {
                    premium_counter += 1;
                }

                embed.addField(`─────────────`, `
                    Name: ${valuations[i].name}
                    Type: ${valuations[i].type}
                    Value: ${valuations[i].value}
                    ─────────────
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
            embed.setTimestamp(realm.auctions*1000);
            embed.setFooter(`DMA-EVA`);
            return embed
        });
        await message.channel.send(valuation);
    },
};