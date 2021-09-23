import { IDiscordSubscription, NOTIFICATIONS } from '@app/core';
import axios from 'axios';
import qs from 'qs';
import { discordConfig } from '@app/configuration';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Client, GuildMember, Interaction } from 'discord.js';

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
            .setDescription('Realms')
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
            .setDescription('(OPTIONAL) Speaking Languages')
            .addChoice('Russian', 'russian')
            .addChoice('English', 'english')
            .addChoice('All', 'all')
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName(NOTIFICATIONS.ORDERS)
        .setDescription('Full order log for the selected item or group')
        .addStringOption(option =>
          option.setName('item_id')
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
          option.setName('item_id')
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

  async executeInteraction(interaction: Interaction, client: Client): Promise<void> {
    try {
      if (!interaction.isCommand()) return;

      const realms = interaction.options.getString('realms');
      const faction = interaction.options.getString('faction');
      const character_class = interaction.options.getString('character_class');
      const languages = interaction.options.getString('languages');
      const item_level = interaction.options.getInteger('item_level');
      const rio_score = interaction.options.getInteger('rio_score');
      const days_from = interaction.options.getInteger('days_from');
      const days_to = interaction.options.getInteger('days_to');
      const wcl_percentile = interaction.options.getInteger('wcl_percentile');

      const item_id = interaction.options.getString('item_id');
      const connected_realm_id = interaction.options.getInteger('connected_realm_id');

      const subscription: IDiscordSubscription = {
        discord_id: interaction.guildId,
        discord_name: interaction.guild.name,
        channel_id: interaction.channelId,
        channel_name: interaction.member instanceof GuildMember ? interaction.member.guild.name : null,
        author_id: interaction.user.id,
        author_name: interaction.user.username,
        type: interaction.commandName as NOTIFICATIONS,
        realms,
        faction,
        character_class,
        languages,
        item_level,
        rio_score,
        days_from,
        days_to,
        wcl_percentile,
        item_id,
        connected_realm_id,
      };

      if (subscription.type === NOTIFICATIONS.ORDERS) {
        await axios({
          method: 'PUT',
          url: `${discordConfig.basename}/api/osint/discord/unsubscribe`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: qs.stringify({ discord_id: subscription.discord_id, channel_id: subscription.channel_id }),
        });

        // TODO return;
      }

      if (subscription.type === NOTIFICATIONS.INFO) {
        const { data: discord } = await axios.get(encodeURI(`${discordConfig.basename}/api/osint/discord?discord_id=${subscription.discord_id}&channel_id=${subscription.channel_id}`));

        // TODO reply current settings and return
      }

      await axios({
        method: 'POST',
        url: `${discordConfig.basename}/api/osint/discord/subscribe`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(subscription, { skipNulls: true }),
      });

      // TODO receive ansfer from endpoint and feel free to go
    } catch (errorOrException) {

    }
  }
}
