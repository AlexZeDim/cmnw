import { SlashCommandBuilder } from '@discordjs/builders';
import { Interaction, Message } from 'discord.js';

module.exports = {
  name: 'whoami',
  description:
    'Prints the effective username and ID of the current user. Check this [article](https://en.wikipedia.org/wiki/Whoami) for more info.',
  aliases: ['WHOAMI', 'Whoami'],
  inDevelopment: false,
  slashOnly: false,
  slashCommand: new SlashCommandBuilder()
    .setName('whoami')
    .setDescription('Prints the effective username and ID of the current user.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Select a user')
        .setRequired(true)),

  async executeMessage(message: Message): Promise<void> {
    await message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`);
  },

  async executeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const user = interaction.options.getUser('target');
    await interaction.reply(`Username: ${user.username}\nID: ${user.id}`);
  },
};
