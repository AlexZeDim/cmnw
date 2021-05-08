import { DiscordInterface, LANG } from '@app/core';
import { sayHello } from '../subscriptions';
import { subscriptionScene } from '../subscriptions/dialogs';

module.exports = {
  name: 'subscribe',
  description: 'Initiate the subscription process for selected channel with allows you to receive announcements',
  aliases: ['subscribe', 'SUBSCRIBE', 'Subscribe', 'sub', 'SUB', 'Sub'],
  cooldown: 5,
  guildOnly: true,
  async execute(message) {
    try {
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

    } catch (e) {
      console.error(e);
    }
  }
}
