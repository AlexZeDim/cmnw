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
const { fromSlug } = require('../db/setters')

/**
 * Modules
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
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
    await discord_db
      .find({})
      .lean()
      .cursor({ batchSize: 10 })
      .eachAsync(
        async ({ _id, channels }) => {
          let guild = await bot.guilds.cache.get(_id)
          if (guild) {
            for (let channel of channels) {
              let guild_channel = await guild.channels.cache.get(channel.id);
              if (guild_channel) {
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
                const LFG_NEW = await characters_db.find(query).limit(10)
                if (LFG_NEW && LFG_NEW.length) {
                  let embed = new Discord.MessageEmbed();
                  embed.setTitle(`WOWPROGRESS LFG`);
                  for (let character_lfg of LFG_NEW) {

                    let raid_progress = '', raider_io_score;

                    await axios.get(encodeURI(`https://raider.io/api/v1/characters/profile?region=eu&realm=howling-fjord&name=Акулов&fields=mythic_plus_scores_by_season:current,raid_progression`)).then(responce => {
                      console.log(responce.data)
                      if (responce.data) {
                        if ('raid_progression' in responce.data) {
                          let raid_progression = responce.data.raid_progression;
                          if (raid_progression) {
                            for (const property in raid_progression) {
                              raid_progress += `${fromSlug(property)}: ${raid_progression[property].summary} \n`
                            }
                          }
                        }
                        if ('mythic_plus_scores_by_season' in responce.data) {
                          let rio_score = responce.data.mythic_plus_scores_by_season
                          if (rio_score && rio_score.length) {
                            for (let rio of rio_score) {
                              if ('scores' in rio) {
                                raider_io_score = rio.scores.all
                              }
                            }
                          }
                        }
                      }
                    })
                    //TODO wowprogress battle.tag and days
                    embed.addField(`─────────────`, `:page_with_curl: [WCL](https://www.warcraftlogs.com/character/eu/${character_lfg.realm.slug}/${character_lfg.name}) :speech_left: [WP](https://www.wowprogress.com/character/eu/${character_lfg.realm.slug}/${character_lfg.name}) :key: [RIO](https://raider.io/characters/eu/${character_lfg.realm.slug}/${character_lfg.name})
Name: [${character_lfg.name}](https://${process.env.domain}/character/${character_lfg.realm.slug}/${character_lfg.name})
${'realm' in character_lfg ? `Realm: ${character_lfg.realm.name}` : ``} 
${'faction' in character_lfg ? `Faction: ${character_lfg.faction}` : ``} 
${'ilvl' in character_lfg ? `Item Level: ${character_lfg.ilvl.avg}` : ``} 
${'character_class' in character_lfg ? `Class: ${character_lfg.character_class}` : ``} 
${raider_io_score ? `RIO: ${raider_io_score}` : ``} 
${raid_progress !== '' ? `${raid_progress}` : ``} 
${character_lfg.wcl_percentile ? `Best Perf. Avg: ${character_lfg.wcl_percentile}` : ``} 
${character_lfg.guild && character_lfg.guild.name ? `Guild: [${character_lfg.guild.name}](https://${process.env.domain}/guild/${character_lfg.realm.slug}/${character_lfg.guild.slug})` : ``} 
${character_lfg.guild && typeof character_lfg.guild.rank !== 'undefined' ? `Rank: ${parseInt(character_lfg.guild.rank) === 0 ? 'GM' : `R${character_lfg.guild.rank}`}` : ``} 
─────────────`, true,
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
