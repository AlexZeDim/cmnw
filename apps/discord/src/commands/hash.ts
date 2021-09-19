import axios from 'axios';
import { HashEmbedMessage } from '../embeds';
import { discordConfig } from '@app/configuration';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Interaction, Message } from 'discord.js';
import { CharacterDto } from '@app/core';

module.exports = {
  name: 'hash',
  description: `Allows you to find no more than 20 (*available*) alternative characters (twinks) in OSINT-DB across different realms. Requires a query parameter, which can be a hash string \`f97efc28\`
    > Remember, that match by any of this hash values separately doesn't guarantee that a selected character would belong to one identity. It only gives you a certain level of confidence.
    
    Usage: \`hash a@a99becec48b29ff\``,
  aliases: ['Hash', 'HASH'],
  cooldown: 10,
  args: true,
  slashCommand: new SlashCommandBuilder()
    .setName('hash')
    .setDescription('Allows you to find no more than 20 twinks in OSINT-DB across different realms.')
    .addStringOption((option) =>
      option.setName('type')
        .setDescription('a | b')
        .setRequired(true))
    .addStringOption((option) =>
      option.setName('hash')
        .setDescription('99becec48b29ff')
        .setRequired(true)),

  async executeMessage(message: Message, args: string): Promise<void> {
    const { data: hash } = await axios.get<Partial<CharacterDto[]>>(encodeURI(`${discordConfig.basename}/api/osint/character/hash?hash=${args}`));
    const embed = HashEmbedMessage(args, hash);
    await message.channel.send({ embeds: [ embed ] });
  },

  async executeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const type = interaction.options.getString('type');
    const hashValue = interaction.options.getString('hash');
    const { data: hash } = await axios.get<Partial<CharacterDto[]>>(encodeURI(`${discordConfig.basename}/api/osint/character/hash?hash=${type}@${hashValue}`));
    const embed = HashEmbedMessage(`${type}@${hashValue}`, hash);
    await interaction.reply({ embeds: [ embed ] });
  }
}
