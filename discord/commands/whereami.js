module.exports = {
    name: 'whereami',
    description: 'Shows information about server',
    guildOnly: true,
    execute(message) {
        message.channel.send(`Guild name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
    },
};