import axios from 'axios';
import { CharacterEmbedMessage } from '../embeds';
import { SlashCommandBuilder } from '@discordjs/builders';
import { discordConfig } from '@app/configuration';
import { Interaction, Message } from 'discord.js';
import { CharacterDto } from '@app/core';

module.exports = {
  name: 'character',
  description:
    'Return information about specific character. Example usage: `character блюрателла@гордунни`',
  aliases: ['char', 'CHAR', 'CHARACTER', 'Char', 'Character'],
  args: true,
  slashCommand: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Return information about specific character.')
    .addStringOption((option) =>
      option.setName('query')
        .setDescription('блюрателла@гордунни')
        .setRequired(true)),

  async executeMessage(message: Message, args: string): Promise<void> {
    const { data: character } = await axios.get<Partial<CharacterDto>>(encodeURI(`${discordConfig.basename}/api/osint/character?_id=${args}`));
    const embed = CharacterEmbedMessage(character);
    await message.channel.send({ embeds: [ embed ] });
  },

  async executeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const id = interaction.options.getString('query');
    const { data: character } = await axios.get<Partial<CharacterDto>>(encodeURI(`${discordConfig.basename}/api/osint/character?_id=${id}`));
    const embed = CharacterEmbedMessage(character);
    await interaction.reply({ embeds: [ embed ] });
  }
}
