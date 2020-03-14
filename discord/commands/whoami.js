module.exports = {
    name: 'whoami',
    description: 'Shows information about yourself',
    execute(message) {
        message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`);
    },
};