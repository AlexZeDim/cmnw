module.exports = {
  name: 'direct',
  description: `Opens a direct channel between you and certain user, by his || her snowflake discord ID. Delivers the message, like it has been sent from the bot itself, without compromising the sender.
    Support various arguments:
     -m (messages) — amount of messages that should be delivered between you and receiver. By default, it equals 50
     -t (time) — amount of seconds. For this amount of time, the message window will open with the receiver. Default value is 1 minute.
     -d (destruction: optional) — amount of seconds. Enabling self-destruction timer for every message that would be delivered.
     -s (secured: optional) — encode the original message with hex or base64. The receiver won't have any notification, so make sure that he will understand your message. Or intellectually capable to decode it. All messages are unsecured by default.
     -r (reply: optional) — Allows the receiver to reply at your messages back.
     -exit or -close — After the following command, instantly close the message window between you and the receiver.
     Example usage: \` User: direct@240464611562881024 -m 50 -t 60 -d 10 -s hex \``,
  aliases: ['DIRECT', 'DM', 'dm', 'Direct'],
  cooldown: 10,
  args: true,
  async execute(message, args, client) {
    const params = args.split(' ');

    const settings = {
      user: params[0],
      reply_channel: undefined,
      time: 60000,
      messages: 50,
      destruction: 10000,
      base64: false,
      hex: false,
      reply: false,
      quotes: ''
    }

    /** Amount of messages, 50 by default */
    if (params.includes('-m')) settings.messages = parseInt(params[params.indexOf('-m') + 1]);
    /** Amount of time in seconds, 1 min by default */
    if (params.includes('-t')) settings.time = parseInt(params[params.indexOf('-t') + 1]) * 1000;

    if (params.includes('-s') && params[params.indexOf('-s') + 1] === 'hex') settings.hex = true

    if (params.includes('-s') && params[params.indexOf('-s') + 1] === 'base64') settings.base64 = true

    if (params.includes('-s')) settings.quotes = '\`\`\`'

    if (params.includes('-r')) settings.reply = true

    if (params.includes('-d')) settings.destruction = parseFloat(params[params.indexOf('-d') + 1]) * 1000;

    await message.channel.send(`Connection established: ${settings.user} for ${settings.time / 1000}s`);

    /** Start message collection event */
    const filter = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector(filter, {
      max: settings.messages,
      time: settings.time,
      errors: ['time'],
    });

    const user = await client.users.fetch(settings.user);

    if (!user) {
      await message.channel.send(`No user: ${settings.user} found!`)
      return
    }

    settings.reply_channel = await user.createDM()

    collector.on('collect', async m => {
      try {
        /** -End or -Close to close the connection */
        if (m.content === '-end' || m.content === '-close' || m.content === '-exit') await collector.stop()
        /** Secured argument, can be a base64 or hex value */
        if (settings.hex) {
          m.content = Buffer.from(m.content, 'utf8')
            .toString('hex')
            .match(/.{1,8}/g)
            .join(' ');
        }
        if (settings.base64) {
          m.content = Buffer.from(m.content, 'utf8').toString('base64');
        }

        while (m.content.length) {
          const message = await user.send(settings.quotes + m.content.substr(0, 1990) + settings.quotes)
          m.content = m.content.substr(1990);
          await message.delete({ timeout: settings.destruction })
        }
      } catch (error) {
        await message.channel.send(`Message wasn't sent to ${settings.user}`);
      }
    });
    collector.on('end', collected => message.channel.send(`Connection closed with ${settings.user}. You send ${collected.size} messages`));

    /** Allows message receiver to reply back */
    if (settings.reply && settings.reply_channel) {
      const reply_user = await client.users.fetch(message.author.id)
      const reply_channel = await reply_user.createDM()
      const reply_filter = m => m.author.id === settings.user;
      const reply_collector = settings.reply_channel.createMessageCollector(
        reply_filter,
        {
          time: settings.time,
          errors: ['time'],
        },
      );
      reply_collector.on('collect', async m => await reply_channel.send(m.content));
      reply_collector.on('end', () => settings.reply_channel.send(`Session was closed.`));
    }
  },
};
