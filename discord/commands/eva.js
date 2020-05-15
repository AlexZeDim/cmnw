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
            embed.setURL('https://discord.js.org/');
            embed.setColor('#333333');
            if ("icon" in item) {
                embed.setThumbnail(item.icon);
            }
            if (asset_class.some(v_class => v_class === 'VENDOR') || asset_class.some(v_class => v_class === 'CONST')) {
                embed.addFields(
                    { name: 'Sell', value: vendor.sell_price, inline: true },
                    { name: 'Buy', value: vendor.buy_price, inline: true },
                    { name: '\u200B', value: "\u200B", inline: true },
                    { name: 'Yield to Market', value: vendor.yieldMarket, inline: true },
                    { name: 'Yield to Reagent', value: vendor.yieldReagent, inline: true },
                );
            }
            if ("lastModified" in market) {
                embed.addField('Price', market.price, true);
                embed.addField('Price Size', market.price_size, true);
                embed.addField('Quantity', market.quantity, true);
                embed.addField('Open Interest', market.open_interest, true);
            }
            if ("yieldReagent" in market) {
                embed.addField('Yield to Reagent', market.yieldReagent, true);
            }
            if ("yieldVendor" in market) {
                embed.addField('Yield to Vendor', market.yieldVendor, true);
            }
            if ("lastModified" in market) {
                embed.addField('\u200B', '\u200B');
            }
            if (derivative.length) {
                derivative.forEach((m, i) => {
                    embed.addFields(
                        { name: 'Method', value: m._id, inline: true },
                        { name: 'Queue Cost', value: m.queue_cost, inline: true },
                        { name: 'Nominal Value', value: m.nominal_value, inline: true },
                    );
                    if ("Premium" in m) {
                        embed.addField('Premium', m.premium, true);
                    }
                    if ("yieldMarket" in m) {
                        embed.addField('Yield to Market', m.yieldMarket, true);
                    }
                    if ("yieldVendor" in m) {
                        embed.addField('Yield to Vendor', m.yieldVendor, true);
                    }
                    if (!(i === derivative.length - 1 && !("value" in reagent))) {
                        embed.addField('\u200B', '\u200B');
                    }
                });
            }
            if (asset_class.some(v_class => v_class === 'CAP')) {
                derivative.forEach((m, i) => {
                    embed.addFields(
                        { name: 'Method', value: m._id, inline: true },
                        { name: 'Queue Cost', value: m.queue_cost, inline: true },
                        { name: 'Nominal Value', value: m.nominal_value, inline: true },
                    );
                    if ("Premium" in m) {
                        embed.addField('Premium', m.premium, true);
                    }
                    if ("yieldMarket" in m) {
                        embed.addField('Yield to Market', m.yieldMarket, true);
                    }
                    if ("yieldVendor" in m) {
                        embed.addField('Yield to Vendor', m.yieldVendor, true);
                    }
                    if (!(i === derivative.length - 1 && !("value" in reagent))) {
                        embed.addField('\u200B', '\u200B');
                    }
                });
            }
            if (asset_class.some(v_class => v_class === 'REAGENT')) {
                if ("index" in reagent) {
                    embed.addFields(
                        { name: 'Method', value: derivative[reagent.index]._id, inline: true },
                        { name: 'Queue Cost', value: derivative[reagent.index].queue_cost, inline: true },
                        { name: 'Nominal Value', value: derivative[reagent.index].nominal_value, inline: true },
                    );
                    if ("Premium" in derivative[reagent.index]) {
                        embed.addField('Premium', derivative[reagent.index].premium, true);
                    }
                    if ("yieldMarket" in derivative[reagent.index]) {
                        embed.addField('Yield to Market', derivative[reagent.index].yieldMarket, true);
                    }
                    if ("yieldVendor" in derivative[reagent.index]) {
                        embed.addField('Yield to Vendor', derivative[reagent.index].yieldVendor, true);
                    }
                    embed.addField('\u200B', '\u200B');
                }
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