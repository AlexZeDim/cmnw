/**
 * Mongo Models
 */
require('../db/connection');
const discord_db = require('../db/models/discord_db');

require('dotenv').config();

const Discord = require('discord.js');
const schedule = require('node-schedule');
const { worker, errorFaultTolerance } = require('./subscriptions/services');

const bot = new Discord.Client();
bot.commands = new Discord.Collection();

bot.commands.set('subscribe', require('./subscriptions/command.js'));

bot.login(process.env.bluratella).then(r => r);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  schedule.scheduleJob('01/5 * * * *', () => {
    /** Every discord subscriber */
    discord_db
      .aggregate([
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
        try {
          const guild = await bot.guilds.cache.get(subscriber.discord_id);
          const guild_channel = await guild.channels.cache.get(subscriber.channel_id);
          if (!guild || !guild_channel) {
            await errorFaultTolerance(subscriber)
          } else {
            await worker(subscriber, guild_channel)
          }
        } catch (error) {
          console.error(`E,${subscriber.discord_id}@${subscriber.channel_id},${error}`)
        }
      })
  });
});

bot.on('message', async message => {
  if (message.author.bot) return;
  let commandName = message.content.split(/(?<=^\S+)\s/)[0];
  const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
  if (!command) return;
  if (message.channel.type !== 'text') return message.reply("Subscriptions work only in Discord Servers");
  try {
    command.execute(message, bot);
  } catch (error) {
    console.error(error);
    await message.reply('There was an error trying to execute that command!');
  }
});
