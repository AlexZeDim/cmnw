/**
 * Mongo Models
 */
require('../db/connection')
const discord_db = require('../db/models/discord_db')
const characters_db = require('../db/models/characters_db')

/**
 * Modules
 */

const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const schedule = require('node-schedule');
const { capitalCase }  = require("capital-case");

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
        `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` command.`,
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
      .find()
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
                    if (property === 'realm' && channel.filters.realm && channel.filters.realm.length) {
                      Object.assign(query, {'realm.slug': { '$in': channel.filters[property] } })
                    }
                    if (property === 'faction') {
                      Object.assign(query, {'faction': channel.filters[property]})
                    }
                    if (property === 'ilvl') {
                      Object.assign(query, {'ilvl.avg': { '$gte': channel.filters[property]}})
                    }
                    if (property === 'character_class') {
                      Object.assign(query, {'character_class': { '$in': channel.filters[property] } })
                    }
                  }
                }
                /** Request characters by OSINT-LFG-NEW with query */
                const charactersNewLfg = await characters_db.aggregate([
                  {
                    $match: query
                  },
                  {
                    $limit: 20
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
                if (charactersNewLfg && charactersNewLfg.length) {
                  for (let character of charactersNewLfg) {
                    console.log(character)
                    /** Additional filters check */
                    if (channel.filters) {
                      if (channel.filters.days_from) {
                        if (channel.filters.days_from < character.lfg.days_from) {
                          continue
                        }
                      }
                      if (channel.filters.wcl) {
                        if (channel.filters.wcl > character.lfg.wcl_percentile) {
                          continue
                        }
                      }
                      if (channel.filters.rio) {
                        if (channel.filters.rio > character.lfg.rio) {
                          continue
                        }
                      }
                    }
                    /** For each character create new embed message */
                    let embed = new Discord.MessageEmbed();

                    if (character.guild) {
                      let guild_string = character.guild.name.toString().toUpperCase()
                      if (typeof character.guild.rank !== 'undefined') {
                        guild_string = guild_string.concat(` // ${parseInt(character.guild.rank) === 0 ? 'GM' : 'R' + character.guild.rank}`);
                      }
                      embed.setTitle(guild_string);
                      embed.setURL(encodeURI(`https://${process.env.domain}/guild/${character.realm.slug}/${character.guild.name}`));
                    }

                    if (character._id) {
                      embed.setAuthor(character._id.toUpperCase(), '', encodeURI(`https://${process.env.domain}/character/${character.realm.slug}/${character.name}`));
                    }

                    if (character.media) {
                      embed.setThumbnail(character.media.avatar_url);
                    }

                    if (character.faction) {
                      if (character.faction === 'Alliance') {
                        embed.setColor('#006aff');
                      } else if (character.faction === 'Horde') {
                        embed.setColor('#ff0000');
                      }
                    }
                    if (character.lastModified) {
                      embed.setTimestamp(character.lastModified);
                    }
                    if (character.ilvl) {
                      embed.addField('Item Level', character.ilvl.avg, true)
                    }
                    if (character.character_class) {
                      embed.addField('Class', character.character_class, true)
                    }
                    if (character.spec) {
                      embed.addField('Spec', character.spec, true)
                    }
                    if (character.hash && character.hash.a) {
                      embed.addField('Hash A', `[${character.hash.a}](https://${process.env.domain}/find/a/${character.hash.a})`, true)
                    }
                    if (character.lfg) {
                      if (character.lfg.rio) {
                        embed.addField('RIO', character.lfg.rio, true)
                      }
                      if (character.lfg.wcl_percentile) {
                        embed.addField('Best.Perf.Avg', `${character.lfg.wcl_percentile} Mythic`, true)
                      }
                      if (character.lfg.role) {
                        embed.addField('Role', character.lfg.role.toString().toUpperCase(), true)
                      }
                      if (character.lfg.days_from && character.lfg.days_to) {
                        embed.addField('RT days', `${character.lfg.days_from} - ${character.lfg.days_to}`, true)
                      }
                      if (character.lfg.battle_tag) {
                        embed.addField('Battle.tag', character.lfg.battle_tag, true)
                      }
                      if (typeof character.lfg.transfer !== 'undefined') {
                        if (character.lfg.transfer) {
                          embed.addField('Transfer', `:white_check_mark:`, true)
                        } else {
                          embed.addField('Transfer', `:x:`, true)
                        }
                      }
                      if (character.lfg.progress) {
                        let pve_progress = character.lfg.progress
                        for (let [key, value] of Object.entries(pve_progress)) {
                          if (key.includes('Nyalotha')) {
                            key = 'Nyalotha'
                          }
                          embed.addField(capitalCase(key), value, true)
                        }
                      }
                    }
                    embed.setDescription(`:page_with_curl: [WCL](https://www.warcraftlogs.com/character/eu/${character.realm.slug}/${character.name}) :speech_left: [WP](https://www.wowprogress.com/character/eu/${character.realm.slug}/${character.name}) :key: [RIO](https://raider.io/characters/eu/${character.realm.slug}/${character.name})\n`)
                    embed.setFooter(`WOWPROGRESS | OSINT-LFG | Сакросантус | Форжспирит`);
                    await guild_channel.send(embed)
                  }
                }
              }
            }
          }
        },
        { parallel: 10 },
      );
  } catch (error) {
    console.error(error)
  }
});

bot.login(process.env.bluratella);
