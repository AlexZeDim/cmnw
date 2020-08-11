module.exports = {
    name: 'members',
    description: 'Returns a JSON file as a result, with all the guild / discord channel members name and IDs',
    aliases: ['MEMBERS'],
    args: true,
    guildOnly: true,
    execute(message) {
        let members = [];
        for(let u in message.guild.members.cache.array()){
            let {user} = message.guild.members.cache.array()[u];
            members.push({id: user.id, name: user.username})
        }
        const file_buffer = Buffer.from(JSON.stringify(members), null, 4);
        message.channel.send(`Name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`, {
            files: [{
                attachment: file_buffer,
                name: 'members.json'
            }]
        })
    },
};