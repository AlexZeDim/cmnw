const { MessageEmbed } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    name: 'char',
    description: 'Check selected character',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        let embed = new MessageEmbed();
        let character = await axios.get(encodeURI(`http://${process.env.localhost}:3030/api/characters/${params[0]}@${params[1]}`)).then(({data}) => {
            let {
                _id,
                id,
                lastModified,
                guild,
                guild_rank,
                character_class,
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
            } = data;
            let g_rank;
            if (guild) {
                embed.setTitle(`${guild.toUpperCase()} // ${guild_rank === 0 ? 'GM' : 'R' + guild_rank}`);
            }
            embed.setAuthor(_id.toUpperCase(), '', 'https://discord.js.org')
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
            if (statusCode === 200) {
                embed.addField('Class', character_class, true);
                embed.addField('Spec', spec, true);
                embed.addField('Race', `${race}, ${gender[0]}`, true);
            }
            if (checksum["pets"] && checksum["mounts"]) {
                embed.addField('ID', id, true);
                embed.addField('Hash A', checksum.pets, true);
                embed.addField('Hash B', checksum.mounts, true);
            }
            if (statusCode === 200) {
                embed.addField('Last Online', new Date(lastModified).toLocaleString('en-GB'), true);
            }
            embed.setTimestamp(updatedAt);
            embed.setFooter(`OSINT-DB | Gonikon`);
            return embed
        });
        await message.channel.send(character);
    },
};
