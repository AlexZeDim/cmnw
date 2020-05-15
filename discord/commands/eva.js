const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'eva',
    description: 'PH',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        let embed = new MessageEmbed();
        let character = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/eva/${params[0]}@${params[1]}`)).then(({data}) => {
            let {
                _id,
                asset_class,
                derivative,
                market,
                reagent,
                vendor,
                item,
                realm,
                updatedAt
            } = data;
            embed.setTitle(`${item.name.en_GB}@${realm.name}`.toUpperCase());
            embed.setAuthor(asset_class.toString().replace(/,/g, ' '), '', '');
            embed.setURL('https://discord.js.org/');
            embed.setColor('#333333');
            if ("icon" in item) {
                embed.setThumbnail(item.icon);
            }
            if (market) {
                embed.addField('Price', market.price, true);
                embed.addField('Price Size', market.price_size, true);
                embed.addField('Quantity', market.quantity, true);
                embed.addField('Open Interest', market.open_interest, true);
                embed.addField('Yield to Reagent', market.yieldReagent, true);
                embed.addField('Yield to Vendor', market.yieldVendor, true);
            }
            embed.addField('\u200B', '\u200B');
            if (derivative) {
                derivative.forEach(m => {
                    embed.addFields(
                        { name: 'Method', value: m._id, inline: true },
                        { name: 'Queue Cost', value: m.queue_cost, inline: true },
                        { name: 'Nominal Value', value: m.nominal_value, inline: true },
                        { name: 'Premium', value: m.premium || 0, inline: true },
                        { name: 'Yield to Market', value: m.yieldMarket, inline: true },
                        { name: 'Yield to Vendor', value: m.yieldVendor, inline: true },
                    )
                    embed.addField('\u200B', '\u200B');
                });
            }
            if ("value" in reagent) {
                embed.addField('CTD', reagent.name.replace(/^[a-z]/i, str => str.toUpperCase()), true);
                embed.addField('Value', reagent.value, true);
                embed.addField('PSN', reagent.premium.length || 0, true);
            }
            embed.setTimestamp(updatedAt);
            embed.setFooter(`PH`);
            return embed
        });
        await message.channel.send(character);
    },
};