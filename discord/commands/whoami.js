module.exports = {
  name: 'whoami',
  description:
    'Prints the effective username and ID of the current user. Check this [article](https://en.wikipedia.org/wiki/Whoami) for more info.',
  aliases: ['WHOAMI'],
  execute(message) {
    message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`,);
  },
};
