const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");
const Discord = require('discord.js');

module.exports = {
    name: 'find',
    description: 'check selected character',
    args: true,
    async execute(message, args) {
        const params = args.split('@');
        let { slug } = await realms_db.findOne({$or: [
                { 'name': params[1] },
                { 'slug': params[1] },
                { 'name_locale': params[1] },
                { 'ticker': params[1] },
            ]});
        let characterData = await characters_db.findById(`${params[0].toLowerCase()}@${slug}`).then(data => {
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
                media
            } = data;
            let embed = new Discord.MessageEmbed();
            embed.setColor('#006aff');
            embed.setTitle(_id.toUpperCase());
            embed.setURL('https://discord.js.org/');
            embed.setThumbnail(media.avatar_url);
            embed.setAuthor(updatedBy, '', 'https://discord.js.org');
            embed.addField('Last Online', lastModified.toLocaleString('en-GB'), true);
            if (guild) {
                embed.addField('Guild', guild, true);
                embed.addField('Guild Rank', guild_rank, true);
            }
            embed.addField('LVL', level, true);
            embed.addField('Class', data.class, true);
            embed.addField('ilvl', ilvl.eq, true);
            embed.addField('Spec', spec, true);
            embed.addField('Race', race, true);
            embed.addField('Faction', faction, true);
            embed.addField('Gender', gender, true);
            embed.addField('Pets', checksum.pets, true);
            embed.addField('Mounts', checksum.mounts, true);
            embed.setTimestamp(updatedAt);
            embed.setFooter(`Gonikon`);
            return embed;
        });
        const sentMessage = await message.channel.send(characterData);
    },
};
