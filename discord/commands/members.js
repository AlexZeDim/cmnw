module.exports = {
    name: 'members',
    description: 'Ping!',
    args: true,
    guildOnly: true,
    execute(message) {
        let members = [];
        for(let u in message.guild.members.cache.array()){
            let {user} = message.guild.members.cache.array()[u];
            members.push({id: user.id, name: user.username})
        }
        let file_buffer = Buffer.from(JSON.stringify(members), null, 4);
        message.channel.send(`Name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`, {
            files: [{
                attachment: file_buffer,
                name: 'members.json'
            }]
        })
    },
};