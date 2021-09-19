import { SlashCommandBuilder } from '@discordjs/builders';

module.exports = {
  name: 'whoami',
  description:
    'Prints the effective username and ID of the current user. Check this [article](https://en.wikipedia.org/wiki/Whoami) for more info.',
  aliases: ['WHOAMI'],
  slashCommand: new SlashCommandBuilder()
    .setName('whoami')
    .setDescription('Prints the effective username and ID of the current user.'),

  async executeMessage(message) {
    await message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`,);
  },

  async executeInteraction(interaction) {
    return await interaction.reply('Pong!');
  }
};
