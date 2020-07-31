module.exports = {
    name: 'direct',
    description: `Direct allows users to hide their identities during direct messaging`,
    args: true,
    execute(message, args, client) {
        let time = 60000;
        let messages = 50;
        let destruction =  10000;
        let res = true;
        const params = args.split(' ');

        /** Amount of messages, 50 by default */
        if (params.includes('-m')) {
            messages = parseInt(params[params.indexOf('-m')+1]);
        }
        /** Amount of time in seconds, 1 min by default */
        if (params.includes('-t')) {
            time = parseInt(params[params.indexOf('-t')+1])*1000;
        }

        message.channel.send(`Connection established: ${params[0]} for ${time/1000}s`);

        /** Start message collection event */
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector(filter, {
            max: messages,
            time: time,
            errors: ['time']
        });
        collector.on('collect',  async m => {
            try {
                /** -End or -Close to close the connection */
                if (m.content === '-end' || m.content === '-close') {
                    collector.close();
                }
                /** Secured argument, can be a base64 or hex value */
                if (params.includes('-s') && (params[params.indexOf('-s') + 1]) === 'hex') {
                    m.content = (Buffer.from(m.content, 'utf8').toString('hex').match(/.{1,8}/g).join(" "));
                }
                if (params.includes('-s') && (params[params.indexOf('-s') + 1]) === 'base64') {
                    m.content = (Buffer.from(m.content, 'utf8').toString('base64'));
                }
                let sentMessage = await client.users.fetch(params[0]).then((user) => {
                    return user.send(`${m.content}`);
                });
                /** Allow message receiver to reply back */
                if (params.includes('-r') && res) {
                    res = false;
                    const res_filter = m => m.author.id === params[0];
                    const res_collector = sentMessage.channel.createMessageCollector(res_filter, {
                        time: time,
                        errors: ['time']
                    });
                    res_collector.on('collect', m => {
                        client.users.fetch(message.author.id).then((u) => {
                            return u.send(`${m.content}`);
                        });
                    });
                }
                /** Enables destruction for messages, in seconds. 10 seconds by default */
                if (params.includes('-d')) {
                    destruction = parseFloat(params[params.indexOf('-d') + 1]) * 1000;
                    await sentMessage.delete({timeout: destruction});
                }
            }  catch (error) {
                await message.channel.send(`Message wasn't sent to ${params[0]}`);
            }
        });

        collector.on('end', collected => {
            message.channel.send(`Connection closed with ${params[0]}. You send ${collected.size} messages`);
        });
    }
};