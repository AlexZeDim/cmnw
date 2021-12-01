import { SlashCommandBuilder } from '@discordjs/builders';
import { ISlashCommandArgs, ORACULUM_COMMANDS } from '@app/core';
import axios from 'axios';
import { Account } from '@app/mongo';
import { LeanDocument } from 'mongoose';
import { discordConfig } from '@app/configuration';
import { WhoisEmbed } from '../embeds';

module.exports = {
  name: ORACULUM_COMMANDS.Whois,
  slashCommand: new SlashCommandBuilder()
    .setName(ORACULUM_COMMANDS.Whois)
    .setDescription('Show information about requested account')
    .addStringOption((option) =>
      option.setName('field')
        .setDescription('Select field to search by')
        .addChoice('Discord', 'discord_id')
        .addChoice('BattleTag', 'battle_tag')
        .addChoice('Nickname', 'nickname')
        .addChoice('Cryptonym', 'cryptonym')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('value')
        .setDescription('Type query value')
        .setRequired(true)
    ),

  async executeInteraction({ interaction }: ISlashCommandArgs): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      const key: string = interaction.options.getString('field', true);
      const value: string = interaction.options.getString('value', true);

      const { data: account } = await axios.get<LeanDocument<Account>>(
        encodeURI(`${discordConfig.basename}/api/auth/account?${key}=${value}`)
      )

      if (!account) return;

      const embed = WhoisEmbed(account);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (errorOrException) {
      console.error(`${ORACULUM_COMMANDS.Whois}: ${errorOrException}`);
    }
  }
}
