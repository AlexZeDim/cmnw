const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'find',
    description: 'check selected character',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        let character = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/characters/${params[0]}@${params[1]}`)).then(({data}) => {
            let {
                _id,
                id,
                lastModified,
                guild,
                guild_rank,
                level,
                ilvl,
                spec,
                gender,
                faction,
                checksum,
                updatedAt,
                updatedBy,
                race,
                media,
                statusCode,
                pets,
                mounts
            } = data;
            let embed = new MessageEmbed();
            embed.setTitle(_id.toUpperCase());
            embed.setAuthor(updatedBy, '', 'https://discord.js.org');
            embed.setURL('https://discord.js.org/');
            if (media) {
                embed.setThumbnail(media.avatar_url);
            }
            if (statusCode === 200) embed.addField('LVL', level, true);
            if (ilvl) {
                embed.addField('Ailvl', ilvl.avg, true);
                embed.addField('Eilvl', ilvl.eq, true);
            }
            if (faction === "Alliance") {
                embed.setColor('#006aff');
            }
            if (faction === "Horde") {
                embed.setColor('#ff0000');
            }
            if (statusCode === 200) embed.addField('Class', data.class, true);
            if (guild) {
                if (guild_rank === 0) {
                    embed.addField('Guild Rank', "GM", true);
                } else {
                    embed.addField('Guild Rank', guild_rank, true);
                }
                embed.addField('Guild', guild, true);
            }
            if (statusCode === 200) {
                embed.addField('Spec', spec, true);
                embed.addField('Race', `${race}, ${gender[0]}`, true);
            }
            if (checksum["pets"] && checksum["mounts"]) {
                embed.addField('ID', id, true);
                embed.addField('Hash A', pets, true);
                embed.addField('Hash B', mounts, true);
            }
            if (statusCode === 200) {
                embed.addField('Last Online', new Date(lastModified).toLocaleString('en-GB'), true);
            }
            embed.setTimestamp(updatedAt);
            embed.setFooter(`Gonikon`);
            return embed
        });
        await message.channel.send(character);
    },
};
