const Discord = require('discord.js');
const client = new Discord.Client();
client.commands = new Discord.Collection();

module.exports = {
    name: 'direct',
    description: 'Ping!',
    args: true,
    execute(message, args, client) {
        let time = 60000;
        let messages = 50;
        let destruction =  10000;
        const params = args.split(' ');

        if (params.includes('-m')) {
            messages = parseFloat(params[params.indexOf('-m')+1]);
        }
        if (params.includes('-t')) {
            time = parseFloat(params[params.indexOf('-t')+1])*1000;
        }
        message.channel.send(`Connection established: ${params[0]}`);
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector(filter, {
            maxMatches: messages,
            time: time,
            errors: ['time']
        });

        collector.on('collect',  async m => {
            try {
                if (m.content === '-end' || m.content === '-close') {
                    collector.stop();
                }
                if (params.includes('-s') && (params[params.indexOf('-s') + 1]) === 'hex') {
                    m.content = (Buffer.from(m.content, 'utf8').toString('hex').match(/.{1,8}/g).join(" "));
                }
                if (params.includes('-s') && (params[params.indexOf('-s') + 1]) === 'base64') {
                    m.content = (Buffer.from(m.content, 'utf8').toString('base64'));
                }
                const sentMessage = await client.fetchUser(params[0]).then(user => {
                    user.send(`${m.content}`);
                });
                if (params.includes('-d')) {
                    destruction = parseFloat(params[params.indexOf('-d') + 1]) * 1000;
                    await sentMessage.delete(destruction);
                }
            }  catch (error) {
                console.log(error);
                await message.channel.send(`Message wasn't sent to ${params[0]}`);
            }
        });

        collector.on('end', collected => {
            message.channel.send(`Connection closed with ${params[0]}. You send ${collected.size} messages`);
        });
    }
};