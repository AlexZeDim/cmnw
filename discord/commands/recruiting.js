require('dotenv').config();
const parse_arguments = require('../parse_arguments')
const { capitalize } = require('../../db/setters')

const discord_db = require('../../db/discord_db')
const realms_db = require('../../db/realms_db')

module.exports = {
  name: 'recruiting',
  description:
    'Subscribes discord server and selected channel for announcements of characters from Kernel\'s WoWProgress, which have quene in Looking for Guild recently. ' +
    'Also, you could filter the results by certain different arguments. Like:\n `-realm` (w/o spaces || all || ru) for realms\n `-ilvl` (number) for item level\n `-faction` (Alliance or Horde) for faction\n `-wcl` (number) for Mythic Performance from Kihra\'s WCL\n `-rio` (number) for RIO score from Aspyr\'s raider.io\n' +
    'ATTENTION! If realm\'s name consist of two words, please remove space between by `-` symbol. Example: `recruiting -realm twisted-nether -ilvl 450`. \n' +
    'To update or modify the parameters just re-type the command with necessary filters. ' +
    'To unsubscribe from updates, use: `recruiting -rm`\n' +
    'To check already enables channel filters use: `recruiting -filters`',
  aliases: ['recruiting', 'recruting', 'Recruiting', 'Recruting', 'RECRUTING', "RECRUITING"],
  cooldown: 30,
  guildOnly: true,
  args: true,
  async execute(message, args) {
    let params, is_deleted;
    let notification = 'Your subscription has been successfully updated';
    let discord_server = await discord_db.findById(message.channel.guild.id)
    /** If we don't have discord, then we create it */
    if (!discord_server) {
      discord_server = new discord_db({
        _id: message.channel.guild.id,
        name: message.channel.guild.name,
        channels: [{
          _id: message.channel.id,
          name: message.channel.name,
        }]
      })
      notification = 'You have been successfully subscribed';
    } else {
      discord_server.channels.addToSet({
        _id: message.channel.id,
        name: message.channel.name
      })
    }

    let channel_index = discord_server.channels.findIndex(c => c._id === message.channel.id);
    if (channel_index === -1) {
      notification = 'I can\'t find you channel as subscriber on selected discord server';
      return message.channel.send(notification);
    } else {
      /** Arguments */
      if (args) {
        params = args.split(' ')
        /** realm */
        let realm = parse_arguments(params, ['-realm', '-realms', '-r'])
        if (realm) {
          if (capitalize(realm) === 'All') {
            discord_server.channels[channel_index].filters.realm = [];
          } else if (capitalize(realm) === 'Ru') {
            let realms = await realms_db.find({
              $text: { $search: 'ru_RU' },
            }, 'slug').lean();
            let filter_realms = []
            for (let realm of realms) {
              filter_realms.push(realm.slug)
            }
            discord_server.channels[channel_index].filters.realm = filter_realms;
          } else {
            let realm_ = await realms_db.findOne({
              $text: { $search: realm },
            });
            if (realm) {
              discord_server.channels[channel_index].filters.realm.addToSet(realm_.slug)
            }
          }
        }
        /** item level */
        let ilvl = parse_arguments(params, ['-ilvl', '-item_level', '-item-level'])
        if (!isNaN(ilvl)) {
          discord_server.channels[channel_index].filters.ilvl = parseInt(ilvl)
        }
        /** WCL */
        let wcl = parse_arguments(params, ['-wcl', '-logs', '-log'])
        if (!isNaN(wcl)) {
          discord_server.channels[channel_index].filters.wcl = parseInt(wcl)
        }
        let rio = parse_arguments(params, ['-rio', '-mythic_keys', '-keys'])
        if (!isNaN(rio)) {
          discord_server.channels[channel_index].filters.rio = parseInt(rio)
        }
        let days_from = parse_arguments(params, ['-days_from', '-from'])
        if (!isNaN(days_from)) {
          discord_server.channels[channel_index].filters.days_from = parseInt(days_from)
        }
        /** faction */
        let faction = parse_arguments(params, ['-faction', '-f'])
        if (faction) {
          faction = capitalize(faction)
          if (faction === 'Alliance' || faction === 'A') {
            discord_server.channels[channel_index].filters.faction = 'Alliance'
          }
          if (faction === 'Horde' || faction === 'H') {
            discord_server.channels[channel_index].filters.faction = 'Horde'
          }
        }
        /** faction */
        let filters = parse_arguments(params, ['-filters'])
        if (filters) {
          let current_filters = discord_server.channels[channel_index].filters
          let message_filters = '';
          if (current_filters) {
            for (const [key, value] of Object.entries(current_filters)) {
              if (typeof value === 'string') {
                message_filters += `${capitalize(key)}: ${capitalize(value)}\n`
              }
              if (typeof value === 'number') {
                message_filters += `${capitalize(key)}: ${value}\n`
              }
              if (Array.isArray(value)) {
                  if (value.length) {
                    message_filters += `${capitalize(key)}: ${value.join(', ')}\n`
                  }
              }
            }
            return message.channel.send(message_filters);
          }
        }
        /** remove */
        let remove = parse_arguments(params, ['-rm', '-remove', '-d', '-delete'])
        if (remove) {
          is_deleted = true;
          if (discord_server) {
            await discord_db.findByIdAndRemove(message.channel.guild.id)
            notification = 'Your **server** has been successfully unsubscribed';
            return message.channel.send(notification);
          } else {
            notification = 'Your **server** has not been subscribed yet!';
            return message.channel.send(notification);
          }
        }
      }
    }

    /** if argument for deletion then we don't save it */
    if (!is_deleted) {
      await discord_server.save()
    }
    return message.channel.send(notification);
  },
};
