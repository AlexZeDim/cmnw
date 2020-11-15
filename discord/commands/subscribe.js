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
    'Use JSON format string for managing your **FILTERS**. Before import, check for validate string syntax here: https://tools.learningcontainer.com/json-validator/ \n' +
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
        return message.channel.send("\`\`\`" + JSON.stringify({ ...discord_subscriber.filters, ...{ type: discord_subscriber.type } }) + "\`\`\`");
      }

      const obj = JSON.parse(args)
      if (obj) {
        if (obj.type && obj.type === 'remove') {
          await discord_db.findOneAndRemove({
            discord_id: message.channel.guild.id,
            channel_id: message.channel.id
          })
          return message.channel.send("Your subscription has been removed")
        }
        if (obj.id && typeof obj.id === 'number') obj.id = [obj.id]
        if (obj.id && typeof obj.id === 'string') {
          const items = await items_db.find({ $text: { $search: obj.id } }, { _id: 1 }).limit(50);
          obj.id = items.map(({ _id }) => _id);
        }
        if (obj.realm && typeof obj.realm === 'string') obj.realm = await realms_db.find({ $text: { $search: obj.realm } }, { _id: 0, slug: 1, auctions: 1 });
        if (obj.character_class && typeof obj.character_class === 'string') obj.character_class = [capitalCase(obj.character_class)]
      }

      if (!discord_subscriber) {
        const subscriber = {
          ...{
            discord_id: message.channel.guild.id,
            discord_name: message.channel.guild.name,
            channel_id: message.channel.id,
            channel_name: message.channel.name,
          },
          ...{ type: obj.type, filters: obj}
        }
        await discord_db.create(subscriber)
        return message.channel.send("Your subscription have been successfully created. To check the filter params, type: **subscribe**")
      }

      if (obj.type) discord_subscriber.type = obj.type
      if (obj.id && obj.id.length) {
        for (const id of obj.id) {
          discord_subscriber.filters.id.addToSet(id)
        }
      }
      if (obj.realm && obj.realm.length) {
        for (const realm of obj.realm) {
          discord_subscriber.filters.realm.addToSet({ slug: realm.slug, auctions: realm.auctions })
        }
      }
      if (obj.character_class && obj.character_class.length) {
        for (const character_class of obj.character_class) {
          discord_subscriber.filters.character_class.addToSet(character_class)
        }
      }
      if (obj.faction) {
        discord_subscriber.filters.faction = obj.faction
      }
      if (obj.ilvl) {
        discord_subscriber.filters.ilvl = obj.ilvl
      }
      if (obj.days_from) {
        discord_subscriber.filters.days_from = obj.days_from
      }
      if (obj.wcl) {
        discord_subscriber.filters.wcl = obj.wcl
      }
      if (obj.rio) {
        discord_subscriber.filters.rio = obj.rio
      }
      await discord_subscriber.save()
      return message.channel.send(`Subscription for channel ${discord_subscriber.channel_id} has been updated. You could check the filtering params with command **subscribe**`)
    } catch (e) {
      console.error(e)
    }
  },
};
