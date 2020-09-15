/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const discord_db = require('../db/discord_db')
const characters_db = require('../db/characters_db')

/**
 * Modules
 */

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const schedule = require('node-schedule');

/** Init Bot Client */

const bot = new Discord.Client();
bot.commands = new Discord.Collection();

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

/** Init list of commands */

const commandFiles = fs
  .readdirSync(path.normalize(`${__dirname}/commands/`))
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.normalize(`${__dirname}/commands/${file}`));
  bot.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

bot.on('message', async message => {
  if (message.author.bot) return;

  let commandName = '';
  let args;

  if (message.content.startsWith('direct')) {
    commandName = message.content.split(/(?<=^\S+)@/)[0];
    args = message.content.split(/(?<=^\S+)@/)[1];
  } else {
    commandName = message.content.split(/(?<=^\S+)\s/)[0];
    args = message.content.split(/(?<=^\S+)\s/)[1];
  }

  let command =
    bot.commands.get(commandName) ||
    bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (command.guildOnly && message.channel.type !== 'text') {
    return message.reply("I can't execute that command inside DMs!");
  }

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${
          command.name
        }\` command.`,
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    command.execute(message, args, bot);
  } catch (error) {
    console.error(error);
    await message.reply('There was an error trying to execute that command!');
  }
});

schedule.scheduleJob('01/5 * * * *', async function() {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({})
      .lean()
      .cursor({ batchSize: 10 })
      .eachAsync(
        async ({ _id, channels }) => {
          /** Get by server ID  */
          let guild = await bot.guilds.cache.get(_id)
          if (guild) {
            /** For every channel */
            for (let channel of channels) {
              let guild_channel = await guild.channels.cache.get(channel._id);
              if (guild_channel) {
                /**
                 * If channel exists, take filters and form query
                 * @type {{updatedBy: string, isWatched: boolean}}
                 */
                let query = { isWatched: true, updatedBy: 'OSINT-LFG-NEW' }
                if (channel.filters) {
                  for (const property in channel.filters) {
                    if (property === 'realm') {
                      Object.assign(query, {'realm.slug': channel.filters[property]})
                    }
                    if (property === 'faction') {
                      Object.assign(query, {'faction': channel.filters[property]})
                    }
                    if (property === 'ilvl') {
                      Object.assign(query, {'ilvl.avg': { '$gte': channel.filters[property]}})
                    }
                  }
                }
                /** Request characters by OSINT-LFG-NEW with query */
                const LFG_NEW = await characters_db.aggregate([
                  {
                    $match: query
                  },
                  {
                    $limit: 10
                  },
                  {
                    $lookup: {
                      from: "realms",
                      localField: "realm.id",
                      foreignField: "_id",
                      as: "realm"
                    }
                  },
                  {
                    $addFields: {
                      realm: { $arrayElemAt: ["$realm", 0] },
                    }
                  }
                ]);
                /** If characters exists */
                if (LFG_NEW && LFG_NEW.length) {
                  /** Form discord message */
                  let embed = new Discord.MessageEmbed();
                  embed.setTitle(`WOWPROGRESS LFG`);
                  for (let character_ of LFG_NEW) {
                    /** Additional filters check */
                    if (channel.filters) {
                      if (channel.filters.days_from) {
                        if (channel.filters.days_from < character_.lfg.days_from) {
                          continue
                        }
                      }
                      if (channel.filters.wcl) {
                        if (channel.filters.wcl > character_.lfg.wcl_percentile) {
                          continue
                        }
                      }
                      if (channel.filters.rio) {
                        if (channel.filters.rio > character_.lfg.rio) {
                          continue
                        }
                      }
                    }
                    /** Initialize variables for character */
                    let message = `:page_with_curl: [WCL](https://www.warcraftlogs.com/character/eu/${character_.realm.slug}/${character_.name}) :speech_left: [WP](https://www.wowprogress.com/character/eu/${character_.realm.slug}/${character_.name}) :key: [RIO](https://raider.io/characters/eu/${character_.realm.slug}/${character_.name})\n`;
                    if (character_.name) {
                      message += `Name: [${character_.name}](https://${process.env.domain}/character/${character_.realm.slug}/${character_.name})\n`
                    }
                    if (character_.realm) {
                      message += `Realm: ${character_.realm.name_locale}\n`
                    }
                    if (character_.faction) {
                      message += `Faction: ${character_.faction}\n`
                    }
                    if (character_.ilvl) {
                      message += `Item Level: ${character_.ilvl.avg}\n`
                    }
                    if (character_.character_class) {
                      message += `Class: ${character_.character_class}\n`
                    }
                    console.log(message)
                    if (character_.guild) {
                      message += `Guild: [${character_.guild.name}](https://${process.env.domain}/guild/${character_.realm.slug}/${character_.guild.slug})\n`
                      if (typeof character_.guild.rank !== 'undefined') {
                        if (parseInt(character_.guild.rank) === 0) {
                          message = 'GM\n';
                        } else {
                          message = `R${character_.guild.rank}\n`;
                        }
                      }
                    }
                    message += `───────────────\n`
                    if (character_.lfg) {
                      if (character_.lfg.rio) {
                        message += `RIO: ${character_.lfg.rio}\n`
                      }
                      if (character_.lfg.wcl_percentile) {
                        message += `Best.Perf.Avg: ${character_.lfg.wcl_percentile} Mythic\n`
                      }
                      if (character_.lfg.progress) {
                        let pve_progress = character_.lfg.progress
                        for (const [key, value] of Object.entries(pve_progress)) {
                          message += `${key}: ${value}\n`
                        }
                      }
                      message += `───────────────`
                    }
                    embed.addField(`───────────────`, message, true,
                    );
                  }
                  embed.setFooter(`OSINT-LFG | Сакросантус | Форжспирит`);
                  guild_channel.send(embed)
                }
              }
            }
          }
        },
        { parallel: 10 },
      );
  } catch (e) {
    console.error(e)
  }
});

bot.login(process.env.bluratella);
