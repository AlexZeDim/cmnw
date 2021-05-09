import { DiscordInterface, LANG, SUBSCRIPTION_REMOVE } from '@app/core';
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

module.exports = {
  name: 'subscribe',
  description: 'Initiate the subscription process for selected channel which allows you to receive notifications',
  aliases: ['subscribe', 'SUBSCRIBE', 'Subscribe', 'sub', 'SUB', 'Sub'],
  cooldown: 5,
  args: true,
  guildOnly: true,
  async execute(message, args) {
    const config: DiscordInterface = {
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
          const { data } = await axios({
            method: 'POST',
            url: `${discordConfig.basename}/api/osint/discord/subscribe`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: qs.stringify(subscription),
          });
          console.log(data);
          const ok = collectionSuccess(subscription, !!discord);
          await message.channel.send(ok);
        } else {
          const fail = collectionClose(config.language);
          await message.channel.send(fail);
        }
      });
    } catch (e) {
      console.error(e);
      const error = seriousError(config.language);
      await message.channel.send(error);
    }
  }
}
