import { IDiscord, LANG, SUBSCRIPTION_REMOVE } from '@app/core';
import {
  collectionClose,
  collectionSuccess,
  sayHello,
  sayRemove,
  seriousError,
  subscriptionScene,
} from '../subscriptions';
import axios from 'axios';
import qs from 'qs';
import { pick } from 'lodash';
import { discordConfig } from '@app/configuration';
import { SlashCommandBuilder } from '@discordjs/builders';

module.exports = {
  name: 'search',
  description: 'Initiate the subscription process for selected channel which allows you to receive notifications',
  aliases: ['search', 'SEARCH', 'Search'],
  cooldown: 5,
  args: true,
  guildOnly: true,
  inDevelopment: true,
  slashOnly: true,
  slashCommand: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Subscribe current channel for updated events like')
    .addSubcommand(subcommand =>
      subcommand
        .setName('candidates')
        .setDescription('Guild candidate search from WowProgress LFG')
        .addStringOption(option =>
          option.setName('realms')
            .setDescription('Realms')
            .addChoice('Russian', 'ru_RU')
            .addChoice('Гордунни', 'gordunni')
            .addChoice('AHNQRJ, BLNZZR, BLDFST, CHRMGS, DGRSPN, LGHSKL, STRDHL, SNSTRD, TLNVRR, TRLLBN', 'gordunni')
            .addChoice('All', 'all')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('faction')
            .setDescription('Select faction')
            .addChoice('Horde', 'Horde')
            .addChoice('Alliance', 'Alliance')
        )
        .addIntegerOption(option =>
          option.setName('item_level')
            .setDescription('Average character item level must be above or equal'))
        .addIntegerOption(option =>
          option.setName('rio_score')
            .setDescription('Character Raider IO Score (if necessary)'))
        .addIntegerOption(option =>
          option.setName('days_from')
            .setDescription('Raid time days from'))
        .addIntegerOption(option =>
          option.setName('days_to')
            .setDescription('Raid time days to'))
        .addIntegerOption(option =>
          option.setName('wcl_percentile')
            .setDescription('Warcraft Logs Mythic Performance (if necessary)'))
        .addStringOption(option =>
          option.setName('character_class')
            .setDescription('Playable Class (only one if necessary)')
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
            .setDescription('Speaking Languages')
            .addChoice('Russian', 'russian')
            .addChoice('English', 'english')
            .addChoice('All', 'all')
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('items')
        .setDescription('Appearing selected item on auction house')
        .addIntegerOption(option =>
          option.setName('item_id')
            .setDescription('Item ID number')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('realms')
            .setDescription('Realms')
            .addChoice('Russian', 'ru_RU')
            .addChoice('Гордунни', 'gordunni')
            .addChoice('AHNQRJ, BLNZZR, BLDFST, CHRMGS, DGRSPN, LGHSKL, STRDHL, SNSTRD, TLNVRR, TRLLBN', 'gordunni')
            .addChoice('All', 'all')
        )),

  async execute(message, args) {
    const config: IDiscord = {
      discord_id: message.channel.guild.id,
      discord_name: message.channel.guild.name,
      channel_id: message.channel.id,
      channel_name: message.channel.name,
      author_id: message.author.id,
      author_name: message.author.username,
      actions: {
        skip: ['пропустить', 'skip'],
        russian: ['русский', 'russian'],
        english: ['английский', 'english'],
        languages: ['german', 'french', 'greek', 'spanish', 'polish'],
        alliance: ['альянс', 'alliance'],
        horde: ['орда', 'horde'],
      },
      messages: 40,
      time: 180000,
      language: LANG.EN,
      prev: 0,
      current: 0,
      index: 0,
      next: 0,
      route: {
        recruiting: [1, 2, 100, 101, 102, 103, 104, 105, 106, 107],
        market: [1, 2, 200],
        orders: [1, 2, 200]
      }
    }
    try {
      if (args) {
        if (SUBSCRIPTION_REMOVE.includes(args)) {
          await axios({
            method: 'PUT',
            url: `${discordConfig.basename}/api/osint/discord/unsubscribe`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify({ discord_id: config.discord_id, channel_id: config.channel_id }),
          });
          const removed = sayRemove(config.discord_name, config.channel_name, config.language)
          await message.channel.send(removed);
          return;
        }
      }

      const { data: discord } = await axios.get(encodeURI(`${discordConfig.basename}/api/osint/discord?discord_id=${config.discord_id}&channel_id=${config.channel_id}`));
      if (discord) Object.assign(config, discord);

      /** Start dialog with settings */
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector(filter, {
        max: config.messages,
        time: config.time,
        errors: ['time'],
      });

      const hello = sayHello(message.author.username, !!config.type);

      await message.channel.send(hello);

      collector.on('collect', async m => {
        config.reply = m.content.toLowerCase().trim();
        const configNew = subscriptionScene(config);
        Object.assign(config, configNew);
        if (configNew.question) {
          await message.channel.send(configNew.question)
          if (configNew.next) config.current = configNew.next
        }
        if (configNew.next === 1000) {
          await collector.stop('ok')
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'ok') {
          const subscription = pick(config, [
              'discord_id',
              'discord_name',
              'channel_id',
              'channel_name',
              'author_id',
              'author_name',
              'type',
              'language',
              'timestamp',
              'items',
              'realms',
              'character_class',
              'days_from',
              'days_to',
              'average_item_level',
              'rio_score',
              'wcl_percentile',
              'faction',
              'languages'
            ]
          );
          await axios({
            method: 'POST',
            url: `${discordConfig.basename}/api/osint/discord/subscribe`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: qs.stringify(subscription),
          });
          const ok = collectionSuccess(subscription, !!discord);
          await message.channel.send(ok);
        } else {
          const fail = collectionClose(config.language);
          await message.channel.send(fail);
        }
      });
    } catch (errorException) {
      console.error(errorException);
      const error = seriousError(config.language);
      await message.channel.send(error);
    }
  }
}
