const { MessageEmbed } = require('discord.js');
const { capitalCase }  = require("capital-case");

const discord_db = require('../../db/models/discord_db')
const characters_db = require('../../db/models/characters_db')


async function lfgQuene (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({ type: "recruiting" })
      .sort({ message_sent: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync( async subscriber => {
        const guild = await bot.guilds.cache.get(subscriber.discord_id);
        if (!guild) {
          return
        }
        const guild_channel = await guild.channels.cache.get(subscriber.channel_id)
        if (!guild_channel) {
          return
        }
        const query = { isWatched: true, updatedBy: 'OSINT-LFG-NEW' }
        if (subscriber.filters) {
          if (subscriber.filters.realm && subscriber.filters.realm.length) Object.assign(query, {'realm.slug': { '$in': subscriber.filters.realm.slug } })
          if (subscriber.filters.faction) Object.assign(query, { 'faction': subscriber.filters.faction })
          if (subscriber.filters.ilvl) Object.assign(query, { 'ilvl.avg': { '$gte': subscriber.filters.ilvl } })
          if (subscriber.filters.character_class && subscriber.filters.character_class.length) Object.assign(query, { 'character_class': { '$in': subscriber.filters.character_class } })
        }
        /** Request characters by OSINT-LFG-NEW with query only for russian realms */
        const characters = await characters_db.aggregate([
          {
            $match: query
          },
          {
            $limit: 25
          },
          {
            $lookup: {
              from: "realms",
              localField: "realm._id",
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
        if (characters.length) {
          for (let character of characters) {
            /** Additional filters check */
            if (subscriber.filters) {
              if (subscriber.filters.days_from) {
                if (subscriber.filters.days_from < character.lfg.days_from) {
                  continue
                }
              }
              if (subscriber.filters.wcl) {
                if (subscriber.filters.wcl > character.lfg.wcl_percentile) {
                  continue
                }
              }
              if (subscriber.filters.rio) {
                if (subscriber.filters.rio > character.lfg.rio) {
                  continue
                }
              }
            }
            /** For each character create new embed message */
            const embed = new MessageEmbed();

            if (character.guild) {
              let guild_string = character.guild.name.toString().toUpperCase()
              if (typeof character.guild.rank !== 'undefined') {
                guild_string = guild_string.concat(` // ${parseInt(character.guild.rank) === 0 ? 'GM' : 'R' + character.guild.rank}`);
              }
              embed.setTitle(guild_string);
              embed.setURL(encodeURI(`https://${process.env.domain}/guild/${character.guild.name}@${character.realm.slug}`));
            }

            if (character._id) {
              embed.setAuthor(`${character.name}@${character.realm.name_locale}`.toUpperCase(), '', encodeURI(`https://${process.env.domain}/character/${character.name}@${character.realm.slug}`));
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
        subscriber.message_sent = Date.now();
        await subscriber.save()
      })
  } catch (error) {
    console.error(error)
  }
}

module.exports = lfgQuene;
