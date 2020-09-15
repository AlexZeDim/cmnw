require('dotenv').config();
const parse_arguments = require('../parse_arguments')
const { capitalize } = require('../../db/setters')

const discord_db = require('../../db/discord_db')
const realms_db = require('../../db/realms_db')

module.exports = {
  name: 'recruiting',
  description:
    'Subscribes discord server and selected channel for announcements of characters from Kernel\'s WoWProgress, which have quene in Looking for Guild recently. ' +
    'Also, you could filter the results by certain different arguments. Like `realm`, `ilvl`, `faction` ' +
    '**If realm\'s name consist of two words, please remove space between by `-` symbol.** Example: `recruiting -ch channel_number -realm twisted-nether -ilvl 450`. To update or modify the parameters just re-type the command with necessary filters. ' +
    'To unsubscribe from updates, use: `recruiting -rm`',
  aliases: ['recruiting', 'recruting', 'Recruiting', 'Recruting', 'RECRUTING', "RECRUITING"],
  cooldown: 30,
  guildOnly: true,
  args: true,
  async execute(message, args) {
    let params, is_deleted, filters = {};
    let notification = 'Your subscription has been successfully updated';
    let discord_server = await discord_db.findById(message.channel.guild.id)
    /** If we don't have discord, then we create it */
    if (!discord_server) {
      discord_server = new discord_db({
        _id: message.channel.guild.id,
        name: message.channel.guild.name,
        channels: [{
          _id: message.channel.id,
          name: message.channel.name
        }]
      })
      notification = 'You have been successfully subscribed';
    } else {
      discord_server.channels.addToSet({
        _id: message.channel.id,
        name: message.channel.name
      })
    }
    /** Arguments */
    if (args) {
      params = args.split(' ')
      /** realm */
      let realm = parse_arguments(params, ['-realm', '-realms', '-r'])
      if (realm) {
        if (capitalize(realm) === 'All') {
          delete filters.realm
        } else {
          let realm_ = await realms_db.findOne({
            $text: { $search: realm },
          });
          if (realm) {
            filters.realm = realm_.slug
          }
        }
      }
      /** item level */
      let ilvl = parse_arguments(params, ['-ilvl', '-item_level', '-item-level'])
      if (!isNaN(ilvl)) {
        filters.ilvl = parseInt(ilvl)
      }
      /** WCL */
      let wcl = parse_arguments(params, ['-wcl', '-logs', '-log'])
      if (!isNaN(wcl)) {
        filters.wcl = parseInt(wcl)
      }
      let rio = parse_arguments(params, ['-rio', '-mythic_keys', '-keys'])
      if (!isNaN(rio)) {
        filters.rio = parseInt(rio)
      }
      let days_from = parse_arguments(params, ['-days_from', '-from'])
      if (!isNaN(days_from)) {
        filters.days_from = parseInt(days_from)
      }
      /** faction */
      let faction = parse_arguments(params, ['-faction', '-f'])
      if (faction) {
        faction = capitalize(faction)
        if (faction === 'Alliance' || faction === 'A') {
          filters.faction = 'Alliance'
        }
        if (faction === 'Horde' || faction === 'H') {
          filters.faction = 'Horde'
        }
      }
      /** remove */
      let remove = parse_arguments(params, ['-rm', '-remove', '-d', '-delete'])
      if (remove) {
        is_deleted = true;
        if (discord_server) {
          await discord_db.findByIdAndRemove(message.channel.guild.id)
          notification = 'Your server has been successfully unsubscribed';
          return message.channel.send(notification);
        } else {
          notification = 'Your server has not been subscribed yet!';
          return message.channel.send(notification);
        }
      }
    }

    let channel_index = discord_server.channels.findIndex(c => c._id === message.channel.id);
    if (channel_index === -1) {
      notification = 'I can\'t find you channel as subscriber on selected discord server';
      return message.channel.send(notification);
    } else {
      for (const filter in filters) {
        discord_server.channels[channel_index].filters[filter] = filters[filter]
      }
    }
    /** if argument for deletion then we don't save it */
    if (!is_deleted) {
      await discord_server.save()
    }
    return message.channel.send(notification);
  },
};
