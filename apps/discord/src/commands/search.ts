import { IDiscordSubscription, NOTIFICATIONS } from '@app/core';
import axios from 'axios';
import qs from 'qs';
import { discordConfig } from '@app/configuration';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildMember, Interaction } from 'discord.js';
import { LeanDocument } from "mongoose";
import { Subscription } from '@app/mongo';
import { SearchEmbedMessage } from '../embeds';

module.exports = {
  name: 'search',
  description: 'Initiate the subscription process for selected channel which allows you to receive notifications',
  aliases: ['search', 'SEARCH', 'Search'],
  cooldown: 5,
  args: true,
  guildOnly: true,
  inDevelopment: false,
  slashOnly: true,
  slashCommand: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Subscribe current channel for updated events like')
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.CANDIDATES)
        .setDescription('Guild candidate search from WowProgress LFG')
        .addStringOption(option =>
          option.setName('realms')
            .setDescription('Realms and Locale')
            .addChoice('Русские', 'ru_RU')
            .addChoice('Deutsch', 'de_DE')
            .addChoice('English', 'en_GB')
            .addChoice('Italiana', 'it_IT')
            .addChoice('Francais', 'fr_FR')
            .addChoice('Español', 'es_ES')
            .addChoice('Across EU Region', 'all')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('faction')
            .setDescription('(OPTIONAL) Select faction')
            .addChoice('Horde', 'Horde')
            .addChoice('Alliance', 'Alliance')
        )
        .addIntegerOption(option =>
          option.setName('item_level')
            .setDescription('(OPTIONAL) Average character item level must be above or equal'))
        .addIntegerOption(option =>
          option.setName('rio_score')
            .setDescription('(OPTIONAL) Character Raider IO Score'))
        .addIntegerOption(option =>
          option.setName('days_from')
            .setDescription('(OPTIONAL) Raid time days from'))
        .addIntegerOption(option =>
          option.setName('days_to')
            .setDescription('(OPTIONAL) Raid time days to'))
        .addIntegerOption(option =>
          option.setName('wcl_percentile')
            .setDescription('(OPTIONAL) Warcraft Logs Mythic Performance'))
        .addStringOption(option =>
          option.setName('character_class')
            .setDescription('(OPTIONAL) Playable Class')
            .addChoice('Warrior', 'Warrior')
            .addChoice('Paladin', 'Paladin')
            .addChoice('Hunter', 'Hunter')
            .addChoice('Rogue', 'Rogue')
            .addChoice('Priest', 'Priest')
            .addChoice('Death Knight', 'Death Knight')
            .addChoice('Shaman', 'Shaman')
            .addChoice('Mage', 'Mage')
            .addChoice('Warlock', 'Warlock')
            .addChoice('Monk', 'Monk')
            .addChoice('Druid', 'Druid')
            .addChoice('Demon Hunter', 'Demon Hunter')
        )
        .addStringOption(option =>
          option.setName('languages')
            .setDescription('(OPTIONAL) Speaking Language')
            .addChoice('Russian', 'russian')
            .addChoice('English', 'english')
            .addChoice('All', 'all')
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.ORDERS)
        .setDescription('Full order log for the selected item or group')
        .addStringOption(option =>
          option.setName('item')
            .setDescription('Item ID, name or asset class ticker for item group')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('connected_realm_id')
            .setDescription('To know ID of your realm use /realm command')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.MARKET)
        .setDescription('Difference result for the selected item')
        .addStringOption(option =>
          option.setName('item')
            .setDescription('Item ID, name or asset class ticker for item group')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('connected_realm_id')
            .setDescription('To know ID of your realm use /realm command')
            .setRequired(true))
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.INFO)
        .setDescription('Shows information about search setting for current Discord channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.CANCEL)
        .setDescription('Cancel any kind of subscription for the selected channel')
    ),

  async executeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    try {
      const realms = interaction.options.getString('realms');
      const faction = interaction.options.getString('faction');
      const character_class = interaction.options.getString('character_class');
      const languages = interaction.options.getString('languages');
      const item_level = interaction.options.getInteger('item_level');
      const rio_score = interaction.options.getInteger('rio_score');
      const days_from = interaction.options.getInteger('days_from');
      const days_to = interaction.options.getInteger('days_to');
      const wcl_percentile = interaction.options.getInteger('wcl_percentile');

      const item = interaction.options.getString('item');
      const connected_realm_id = interaction.options.getInteger('connected_realm_id');

      const querySubscription: IDiscordSubscription = {
        _id: `${interaction.guildId}${interaction.channelId}`,
        discord_id: interaction.guildId,
        discord_name: interaction.guild.name,
        channel_id: interaction.channelId,
        channel_name: interaction.member instanceof GuildMember ? interaction.member.guild.name : null,
        author_id: interaction.user.id,
        author_name: interaction.user.username,
        type: interaction.options.getSubcommand() as NOTIFICATIONS,

        realms,
        faction,
        character_class,
        languages,
        item_level,
        rio_score,
        days_from,
        days_to,
        wcl_percentile,

        item,
        connected_realm_id,
      };

      if (querySubscription.type === NOTIFICATIONS.CANCEL) {

        const { data: removedSubscription } = await axios.put<LeanDocument<Subscription>>(`${discordConfig.basename}/api/osint/discord/unsubscribe`,
          { discord_id: querySubscription.discord_id, channel_id: querySubscription.channel_id },
          {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (!removedSubscription) {
          throw new Error(`It seems that channel ${querySubscription.channel_id} doesn't have subscribed search for removal.`);
        }

        const embed = SearchEmbedMessage(removedSubscription);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      if (querySubscription.type === NOTIFICATIONS.INFO) {
        const { data: currentSubscription } = await axios.get<LeanDocument<Subscription>>(
          encodeURI(`${discordConfig.basename}/api/osint/discord?discord_id=${querySubscription.discord_id}&channel_id=${querySubscription.channel_id}`)
        );

        if (!currentSubscription) {
          throw new Error(`It seems that channel ${querySubscription.channel_id} doesn't have subscribed search at all. Feel free to subscribe!`);
        }

        const embed = SearchEmbedMessage(currentSubscription);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const { data: createdSubscription } = await axios.request<LeanDocument<Subscription>>({
        method: 'POST',
        url: `${discordConfig.basename}/api/osint/discord/subscribe`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(querySubscription, { skipNulls: true }),
      });

      if (!createdSubscription) {
        throw new Error(`Probably something goes wrong. Please report directly to AlexZeDim#2645 with #search error.`);
      }

      const embed = SearchEmbedMessage(createdSubscription);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (errorOrException) {
      console.error(errorOrException);
      await interaction.reply({ content: errorOrException.message, ephemeral: true });
    }
  }
}
