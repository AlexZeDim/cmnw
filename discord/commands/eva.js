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
            embed.setTitle(asset_class.toString().replace(/,/g, ' '));
            embed.setAuthor(`${item.name.en_GB}@${realm.name}`.toUpperCase(), '', '');

            let descriptionString = '';

            if (derivative.length) {
                descriptionString = descriptionString.concat(`*Derivative pricing is based on ${derivative.length} ${derivative.length === 1 ? 'method' : 'methods'}*\n _ _`)
            }
            if (reagent.premium.length) {
                descriptionString = descriptionString.concat(`*Premium pricing is based on ${reagent.premium.length} ${reagent.premium.length === 1 ? 'method' : 'methods'}*\n _ _`)
            }
            embed.setDescription(descriptionString);
            //embed.setURL('https://discord.js.org/');
            embed.setColor('#333333');
            if ("icon" in item) {
                embed.setThumbnail(item.icon);
            }
            if (asset_class.some(v_class => v_class === 'VENDOR') || asset_class.some(v_class => v_class === 'CONST')) {
                embed.addFields(
                    { name: 'Sell', value: vendor.sell_price, inline: true },
                    { name: 'Buy', value: vendor.buy_price, inline: true },
                    { name: '\u200B', value: "\u200B", inline: true },
                    { name: 'Yield to Market', value: `${vendor.yieldMarket} %`, inline: true },
                    { name: 'Yield to Reagent', value: `${vendor.yieldReagent} %`, inline: true },
                );
            }
            if ("lastModified" in market) {
                embed.addField('\u200B', '\u200B');
                embed.addField('Price', `${market.price} g`, true);
                embed.addField('Price Size', `${market.price_size}g`, true);
                embed.addField('Quantity', `x${market.quantity}`, true);
                embed.addField('Open Interest', market.open_interest, true);
                if ("yieldReagent" in market) {
                    embed.addField('Yield to Reagent', `${market.yieldReagent} %`, true);
                }
                if ("yieldVendor" in market) {
                    embed.addField('Yield to Vendor', `${market.yieldVendor} %`, true);
                }
            }
            if (derivative.length) {
                embed.addField('\u200B', '\u200B');
                let m;
                if ("index" in reagent) {
                    m = derivative[reagent.index]
                } else {
                    m = derivative.reduce((prev, curr) => prev.nominal_value < curr.nominal_value ? prev : curr);
                }
                embed.addFields(
                    { name: 'Method', value: `[${m._id}](https://discordapp.com)`, inline: true },
                    { name: 'Queue Cost', value: m.queue_cost, inline: true },
                    { name: 'Nominal Value', value: m.nominal_value, inline: true },
                );
                if ("Premium" in m) {
                    embed.addField('Premium', m.premium, true);
                }
                if ("yieldMarket" in m) {
                    embed.addField('Yield to Market', `${m.yieldMarket} %`, true);
                }
                if ("yieldVendor" in m) {
                    embed.addField('Yield to Vendor', `${m.yieldVendor} %`, true);
                }
            }
            if ("value" in reagent) {
                embed.addField('CTD', reagent.name.replace(/^[a-z]/i, str => str.toUpperCase()), true);
                embed.addField('Value', reagent.value, true);
                //embed.addField('PSN', reagent.premium.length || 0, true);
            }
            embed.setTimestamp(updatedAt);
            embed.setFooter(`PH`);
            return embed
        });
        await message.channel.send(character);
    },
};