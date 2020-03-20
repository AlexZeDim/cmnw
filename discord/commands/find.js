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
                media,
                statusCode,
                pets,
                mounts
            } = data;
            let embed = new Discord.MessageEmbed();
            embed.setTitle(_id.toUpperCase());
            embed.setAuthor(updatedBy, '', 'https://discord.js.org');
            embed.setURL('https://discord.js.org/');
            if (media) {
                embed.setThumbnail(media.avatar_url);
            }
            embed.addField('LVL', level, true);
            embed.addField('Ailvl', ilvl.avg, true);
            embed.addField('Eilvl', ilvl.eq, true);
            embed.addField('Faction', faction, true);
            if (guild) {
                embed.addField('Guild', guild, true);
                if (guild_rank === 0) {
                    embed.addField('Guild Rank', "GM", true); 
                } else {
                    embed.addField('Guild Rank', guild_rank, true);
                }
            } 
            if (faction === "Alliance") {
                embed.setColor('#006aff');
            }
            if (faction === "Horde") {
                embed.setColor('#ff0000');
            }
            embed.addField('Class', data.class, true);
            embed.addField('Spec', spec, true);
            embed.addField('Race', `${race},${gender[0]}`, true);
            if (checksum) {
                embed.addField('Pets', checksum.pets, true);
                embed.addField('Mounts', checksum.mounts, true);
            }
            if (statusCode === 200) {  
                embed.setTimestamp(updatedAt);
                embed.addField('Last Online', lastModified.toLocaleString('en-GB'), true);
            }
            embed.setFooter(`Gonikon`);
            return embed;
        });
        const sentMessage = await message.channel.send(characterData);
    },
};
