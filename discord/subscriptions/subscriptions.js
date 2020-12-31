require('../../db/connection')

const Discord = require('discord.js');

const bot = new Discord.Client();

console.log(process.env.bluratella)

bot.login(process.env.bluratella);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  subscriptions(bot).then(r => r)
});

const discord_db = require('../../db/models/discord_db')

const subscription = require('./subscription')

async function subscriptions (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .aggregate([
        { //FIXME remove
          $match: {
            discord_name: 'Depo',
            type: 't&s',
          }
        },
        {
          $sort: { message_sent: 1 }
        },
        {
          $lookup: {
            from: 'realms',
            localField: 'filters.realms',
            foreignField: '_id',
            as: 'filters.realms',
          },
        },
        {
          $lookup: {
            from: 'items',
            localField: 'filters.items',
            foreignField: '_id',
            as: 'filters.items',
          },
        },
      ])
      .cursor({ batchSize: 10 })
      .exec()
      .eachAsync(async subscriber => {
        const guild = await bot.guilds.cache.get(subscriber.discord_id);
        if (!guild) {
          await discord_db.findByIdAndUpdate(subscriber._id, { fault_tolerance: (subscriber.fault_tolerance || 0) + 1})
          if (subscriber.fault_tolerance && subscriber.fault_tolerance > 9) await discord_db.deleteOne({ _id: subscriber._id })
          console.warn(`DISCORD: ${subscriber.discord_name}@${subscriber.channel_name} unable to fetch`)
          return
        }
        const guild_channel = await guild.channels.cache.get(subscriber.channel_id)
        if (!guild_channel) {
          await discord_db.findByIdAndUpdate(subscriber._id, { fault_tolerance: (subscriber.fault_tolerance || 0) + 1})
          if (subscriber.fault_tolerance && subscriber.fault_tolerance > 9) await discord_db.deleteOne({ _id: subscriber._id })
          console.warn(`DISCORD: ${subscriber.discord_name}@${subscriber.channel_name} unable to fetch`)
          return
        }
        await subscription(subscriber, guild_channel)
      })
  } catch (error) {
    console.error(error)
  } finally {
    process.exit(0)
  }
}
