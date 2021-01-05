require('dotenv').config();
const { capitalCase }  = require("capital-case");

const discord_db = require('../../db/models/discord_db');
const items_db = require('../../db/models/items_db');
const realms_db = require('../../db/models/realms_db');

module.exports = {
  name: 'subscribe',
  description:
    'Subscribes selected channel for announcements: \n' +
    ' `sub {"type":"recruiting"}` to receive notifications about characters from Kernel\'s WoWProgress, which have quene in Looking for Guild recently.\n' +
    ' `sub {"type":"orders"}` to receive updates about newly added item on Auction House via Conglomerat: DMA\n' +
    '\n' +
    '**FILTERS:** \n' +
    'sub {"key": "string", "number_key": 123, "array_key": ["string", 123]} \n' +
    'Use **only JSON format string** for managing your **FILTERS**. "Quotes": "are" important! You could validate your filters string at: \`https://tools.learningcontainer.com/json-validator/\` \n' +
    '\n' +
    '  **id** (array of [numbers] | 123 (number)): `{"type":"orders" | "t&s"}`: track selected item by id \n' +
    '  **faction** ("string" [Alliance | Horde]): `{"type":"recruiting"}`: filter characters by exact faction value\n' +
    '  **ilvl** (number): `{"type": "orders" | "t&s" | "recruiting"}`: show only items or characters with greater then filtered item_level \n' +
    '  **days_from** (number): `{"type": "recruiting"}`: show characters which have more or equal amount of raid days in their wowprogress profile \n' +
    '  **wcl** (number): `{"type": "recruiting"}`: filter characters with greater or equal Average Mythic Performance from Kihra Warcraft Logs \n' +
    '  **rio** (number): `{"type": "recruiting"}`: filter characters with greater or equal M+ raider.io score  \n' +
    '  **character_class** (["Rogue", "Mage", "Warrior"] array of [strings] | "Rogue" (string)): `{"type": "recruiting"}`: show only characters in LFG queue which have exact match by class \n' +
    '\n' +
    '*ATTENTION!* If realm slug name consist of two words, please remove space between by `-` symbol. Example `sub {"realm":"howling-fjord"}`\n' +
    'Realm "key":"value" also support locale (ru_RU, en_GB, de_DE, fr_FR) `sub {"realm":"ru_RU"}` and entire region argument `sub {"realm":"Europe"}`\n' +
    '\n' +
    'To unsubscribe channel from updates, use: `sub {"type": "remove"}`\n' +
    'To check already existing **FILTERS** use `sub` command in already subscribed channel\n',
  aliases: ['subscribe', 'SUBSCRIBE', 'Subscribe', 'sub', 'SUB', 'Sub'],
  cooldown: 5,
  guildOnly: true,
  args: true,
  async execute(message, args) {
    try {

      if (!message.channel.guild.id || !message.channel.id) return message.channel.send('Oops, Discord failure.. Try that again.')

      const discord_subscriber = await discord_db.findOne({
        discord_id: message.channel.guild.id,
        channel_id: message.channel.id
      })

      if (discord_subscriber && !args) {
        return message.channel.send("\`\`\`" + JSON.stringify({ ...discord_subscriber.toObject().filters, ...{ type: discord_subscriber.type } }, null, 2) + "\`\`\`");
      }

      const parse_args = JSON.parse(args)
      if (parse_args) {
        if (parse_args.type && parse_args.type === 'remove') {
          await discord_db.findOneAndRemove({
            discord_id: message.channel.guild.id,
            channel_id: message.channel.id
          })
          return message.channel.send("Your subscription has been removed")
        }
        if (parse_args.items) {
          if (typeof parse_args.items === 'string') {
            const items = await items_db.find({ $text: { $search: parse_args.id } }, { _id: 1 }).limit(50).lean();
            parse_args.items = items.map(({ _id }) => _id);
          } else if (typeof parse_args.items === 'number') {
            parse_args.items = [parse_args.items]
          } else if (Array.isArray(parse_args.items)) {
            parse_args.items = parse_args.items.map(i => parseInt(i))
          }
        }
        if (parse_args.realms) {
          if (typeof parse_args.realms === 'string') {
            const realms = await realms_db.find({ $text: { $search: parse_args.realm } }, { _id: 1 }).lean()
            parse_args.realms = realms.map(({ _id }) => _id);
          } else if (Array.isArray(parse_args.realms)) {
            parse_args.realms = parse_args.realms.map(r => parseInt(r))
          }
        }
        if (parse_args.character_class) {
          if (typeof parse_args.character_class === 'string') {
            parse_args.character_class = [capitalCase(parse_args.character_class)]
          } else if (Array.isArray(parse_args.character_class)) {
            parse_args.character_class = parse_args.character_class.map(c => capitalCase(c))
          }
        }
      }

      if (!discord_subscriber) {
        const subscriber = {
          ...{
            discord_id: message.channel.guild.id,
            discord_name: message.channel.guild.name,
            channel_id: message.channel.id,
            channel_name: message.channel.name,
          },
          ...{ type: parse_args.type, filters: parse_args}
        }
        await discord_db.create(subscriber)
        return message.channel.send("Your subscription have been successfully created. To check the filter params, type: **subscribe**")
      }

      if (parse_args.type) discord_subscriber.type = parse_args.type
      if (parse_args.items && parse_args.items.length) {
        for (const item of parse_args.items) {
          discord_subscriber.filters.id.addToSet(item)
        }
      }
      if (parse_args.realm && parse_args.realm.length) {
        for (const realm of parse_args.realm) {
          discord_subscriber.filters.realm.addToSet(realm)
        }
      }
      if (parse_args.character_class && parse_args.character_class.length) {
        for (const character_class of parse_args.character_class) {
          discord_subscriber.filters.character_class.addToSet(character_class)
        }
      }
      if (parse_args.faction) {
        discord_subscriber.filters.faction = parse_args.faction
      }
      if (parse_args.ilvl) {
        discord_subscriber.filters.ilvl = parse_args.ilvl
      }
      if (parse_args.days_from) {
        discord_subscriber.filters.days_from = parse_args.days_from
      }
      if (parse_args.wcl) {
        discord_subscriber.filters.wcl = parse_args.wcl
      }
      if (parse_args.rio) {
        discord_subscriber.filters.rio = parse_args.rio
      }
      await discord_subscriber.save()
      return message.channel.send(`Subscription for channel ${discord_subscriber.channel_id} has been updated. You could check the filtering params with command **subscribe**`)
    } catch (e) {
      console.error(e)
    }
  },
};
