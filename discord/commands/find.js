const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");
const Discord = require('discord.js');

module.exports = {
    name: 'check',
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
            console.log(data);
            return new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Some title')
                .setURL('https://discord.js.org/')
                .setDescription('Some description here')
                .setThumbnail('https://i.imgur.com/wSTFkRM.png')
                .setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
                .addField('Name', data.name)
                .setTimestamp(data.updatedAt)
                .setFooter(`Example footer`);
        });
        const sentMessage = await message.channel.send(characterData);
    },
};