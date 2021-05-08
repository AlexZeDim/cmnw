import { DiscordInterface, LANG, SUBSCRIPTION_INTRO, WELCOME_FAMILIAR, WELCOME_FIRST_TIME } from '@app/core';

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
        },
      }

      /** Start dialog with settings */
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector(filter, {
        max: config.messages,
        time: config.time,
        errors: ['time'],
      });

      await message.channel.send(`Greetings / Привет ${message.author.username}\n ${(config.type) ? (WELCOME_FIRST_TIME) : (WELCOME_FAMILIAR)}${SUBSCRIPTION_INTRO}`);

    } catch (e) {

    }
  }
}
