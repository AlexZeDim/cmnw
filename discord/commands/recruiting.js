const discord_db = require('../../db/discord_db')
const realms_db = require('../../db/realms_db')
require('dotenv').config();

module.exports = {
  name: 'recruiting',
  description:
    'Subscribes Discord server and selected channel (requires channel_id, *uses current channel by default*) for announcements of characters from Kernel\'s WoWProgress, which have quene in Looking for Guild recently. ' +
    'Also, you could clarify the request, by adding realm and item level. Example `recruiting -ch channel_number -realm twisted-nether -ilvl 450`. To update or modify the parameters just re-type the command with necessary filters. ' +
    'To unsubscribe from updates, use: `recruiting -rm`',
  aliases: ['recruiting', 'recruting', 'Recruiting', 'Recruting', 'RECRUTING', "RECRUITING"],
  cooldown: 60,
  guildOnly: true,
  args: true,
  async execute(message, args) {
    let params;
    let notification = 'Your subscription has been successfully updated';
    let channel = {
      id: message.channel.id,
      name: message.channel.name,
    };
    let discord_server = await discord_db.findById(message.channel.guild.id)
    if (!discord_server) {
      discord_server = new discord_db({
        _id: message.channel.guild.id,
        name: message.channel.guild.name,
        coverage: {}
      })
      notification = 'You have been successfully subscribed';
    }
    /** Set channelID */
    if (args) {
      params = args.split(' ');
      if (params.includes('-ch')) {
        channel.id = params[params.indexOf('-ch') + 1];
        let { name } = await message.channel.guild.channels.cache.get(channel.id);
        channel.name = name;
      }
      if (params.includes('-realm')) {
        let filter_realm = params[params.indexOf('-realm') + 1]
        if (filter_realm) {
          let realm = await realms_db.findOne({
            $text: { $search: filter_realm },
          });
          if (realm && discord_server) {
            discord_server.coverage.realm = realm.slug
          }
        }
      }
      if (params.includes('-ilvl')) {
        let filter_ilvl = parseInt(params[params.indexOf('-ilvl') + 1]);
        if (filter_ilvl && discord_server) {
          discord_server.coverage.ilvl = filter_ilvl
        }
      }
      if (params.includes('-rm')) {
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
    discord_server.channel = channel;
    await discord_server.save()
    return message.channel.send(notification);
  },
};
