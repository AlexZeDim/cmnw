const { installer } = require('./services');
const discord_db = require('../../db/models/discord_db');

module.exports = {
  name: 'subscribe',
  description: 'Initiate the subscription process for selected channel with allows you to receive announcements',
  aliases: ['subscribe', 'SUBSCRIBE', 'Subscribe', 'sub', 'SUB', 'Sub'],
  cooldown: 5,
  guildOnly: true,
  async execute(message) {
    try {
      const discord_subscriber = await discord_db.findOne({
        discord_id: message.channel.guild.id,
        channel_id: message.channel.id
      });

      const config = {
        discord_id: message.channel.guild.id,
        discord_name: message.channel.guild.name,
        channel_id: message.channel.id,
        channel_name: message.channel.name,
        author_id: message.author.id,
        author_name: message.author.username,
        messages: 40,
        time: 180000,
        prev: 0,
        current: 0,
        index: 0,
        next: 0,
        route: {
          recruiting: [1, 2, 100, 101, 102, 103, 104, 105, 106, 107],
          marketdata: [1, 2, 200],
          orders: [1, 2, 200]
        },
        reply: undefined,
        filters: {},
        import_string: ''
      }

      if (discord_subscriber) Object.assign(config, discord_subscriber.toObject())

      /** Start dialog with settings */
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector(filter, {
        max: config.messages,
        time: config.time,
        errors: ['time'],
      });

      await message.channel.send(`${message.author.username}\nGreeting / Привет \n ${(config.type) ? ('Are you ready to get started with subscriptions? / Готов познакомится с подписками на события?\n') : ('I saw you already familiar with subscriptions. So what about editing the current one? / Смотрю, ты уже знаком с подписками, как насчет того, что бы отредактировать параметры текущих уведомлений?\n')}Type one of two language names below to start / Выбери и напиши один из двух языков, что бы начать \n \`english\` / \`русский\``)

      collector.on('collect', async m => {
        try {
          config.reply = m.content.toLowerCase().trim()
          const response = await installer(config)
          Object.assign(config, response)
          if (response.question) {
            await message.channel.send(response.question)
            if (response.next) config.current = response.next
          }
          if (response.next === 1000) {
            await collector.stop('ok')
          }
        } catch (e) {
          await message.channel.send(`${(config.lang === 'rus') ? ('Что-то с вашими сообщениями не так. Может стоит попробовать снова?') : ('Something wrong with that! Let us try again, shall we?')}`);
        }
      })

      collector.on('end', async (collected, reason) => {
        if (reason === 'ok') {
          await message.channel.send(`${(config.lang === 'rus') ? ('Ну вот и всё! Сообщение об успешно созданной подписки можно будет найти ниже.') : ('That\'s all! The message below will show you a subscription status.')}`)
          Object.entries(config.filters).map(([key, value]) => {
              config.import_string += `${key}: ${value} \n`
            }
          )

          if (discord_subscriber) {
            Object.assign(discord_subscriber, config)
            discord_subscriber.markModified('filters')
            await discord_subscriber.save();
            if (config.lang === 'rus') {
              await message.channel.send(
                'Успех! Ваша подписка была обновлена. Ваши текущие настройки: \n \`\`\`' + config.import_string + '\`\`\`'
              )
            } else {
              await message.channel.send(
                'Success! Your subscription has been updated. Your current settings: \n \`\`\`' + config.import_string + '\`\`\`'
              )
            }
          } else {
            await discord_db.create(config)
            if (config.lang === 'rus') {
              await message.channel.send(
                'У вас получилось подписаться со следующими настройками:  \`\`\`' + config.import_string + '\`\`\`'
              )
            } else {
              await message.channel.send(
                'You have been successfully subscribed with the following settings:  \`\`\`' + config.import_string + '\`\`\`'
              )
            }
          }
        } else {
          await message.channel.send(`${(config.lang === 'rus') ? ('Что-то с вашими сообщениями не так. Может стоит попробовать снова?') : ('Something wrong with that! Let us try again, shall we?')}`);
        }
      });
    } catch (error) {
      console.error(`E,subscribe:${error}`)
    }
  }
}
