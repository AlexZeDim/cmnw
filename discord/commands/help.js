require('dotenv').config();

module.exports = {
  name: 'help',
  description:
    'List all of all available commands or info about a specific command.',
  aliases: ['commands', 'HELP', 'Help'],
  usage: '[command name]',
  cooldown: 5,
  execute(message, args) {
    const data = [];
    const { commands } = message.client;

    if (!args) {
      data.push('List of all available commands:\n');
      data.push(commands.map(command => command.name).join('\n'));
      data.push(`\nUse help [command name] to get info about specific command`);

      return message.channel
        .send(data, { split: true })
        .then(() => {
          if (message.channel.type === 'dm') return;
          message.reply("I've sent you a message with all my commands!");
        })
        .catch(error => {
          console.error(
            `Could not send help to ${message.author.tag}.\n`,
            error,
          );
          message.reply(
            "it seems like I can't message you!",
          );
        });
    }
    const name = args.toLowerCase();
    const command =
      commands.get(name) ||
      commands.find(c => c.aliases && c.aliases.includes(name));

    if (!command) {
      return message.reply(`Command ${name} not found`);
    }

    data.push(`**Name:** ${command.name}`);

    if (command.aliases)
      data.push(`**Aliases:** ${command.aliases.join(', ')}`);
    if (command.description)
      data.push(`**Description:** ${command.description}`);
    if (command.usage) data.push(`**Usage:** ${command.name} ${command.usage}`);

    data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);

    message.channel.send(data, { split: true });
  },
};
