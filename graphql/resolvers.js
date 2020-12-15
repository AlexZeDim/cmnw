const characters_db = require('../db/models/characters_db');
const guilds_db = require('../db/models/guilds_db');
const realms_db = require('../db/models/realms_db');
const osint_logs_db = require('../db/models/osint_logs_db');
const keys_db = require('../db/models/keys_db');
const wowtoken_db = require('../db/models/wowtoken_db');
const messages_db = require('../db/models/messages_db')
const items_db = require('../db/models/items_db');

const getCharacter = require('../osint/characters/get_character');
const getGuild = require('../osint/guilds/get_guild')
const queryItemAndRealm = require('./handlers/item_realms');
const itemExtended = require('./handlers/item_extended')

const root = {
  character: async ({ id }) => {
    if (!id.includes('@')) return
    const [ nameSlug, realmSlug ] = id.split('@');
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return
    const character = await characters_db.findById(`${nameSlug.toLowerCase()}@${realm.slug}`).lean();
    if (!character || (new Date().getTime() - 2.628e+9 > character.updatedAt.getTime())) {
      const { token } = await keys_db.findOne({ tags: `OSINT-indexCharacters` });
      await getCharacter({ name: nameSlug, realm: { slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`, token: token, guildRank: true, createOnlyUnique: false});
      return await characters_db.findById(`${nameSlug.toLowerCase()}@${realm.slug}`).lean();
    }
    character.logs = await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000)
    return character
  },
  guild: async ({ id }) => {
    if (!id.includes('@')) return
    const [ name, realmSlug ] = id.split('@');
    const nameSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/'+/g, '')
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return
    const [guild] = await guilds_db.aggregate([
      {
        $match: {
          _id: `${nameSlug}@${realm.slug}`,
        },
      },
      {
        $lookup: {
          from: 'characters',
          localField: 'members._id',
          foreignField: '_id',
          as: 'members',
        },
      },
      {
        $lookup: {
          from: 'osint_logs',
          localField: '_id',
          foreignField: 'root_id',
          as: 'logs',
        },
      },
    ]).allowDiskUse(true).exec();
    if (!guild) {
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getGuild({ name: nameSlug, realm: realm, createdBy: 'OSINT-userInput', updatedBy: 'OSINT-userInput', token: token, createOnlyUnique: true })
      const [guild_updated] = await guilds_db.aggregate([
        {
          $match: {
            _id: `${nameSlug}@${realm.slug}`,
          },
        },
        {
          $lookup: {
            from: 'characters',
            localField: 'members._id',
            foreignField: '_id',
            as: 'members',
          },
        },
        {
          $lookup: {
            from: 'osint_logs',
            localField: '_id',
            foreignField: 'root_id',
            as: 'logs',
          },
        },
      ]).allowDiskUse(true).exec();
      return guild_updated
    }
    return guild
  },
  hash: async ({ query }) => {
    if (!query.includes('@')) return
    const [ type, hash ] = query.toLowerCase().split("@")
    return await characters_db.find({ [`hash.${type}`]: hash }).limit(60).lean()
  },
  wowtoken: async ({ region }) => {
    return await wowtoken_db
      .findOne({ region: region })
      .sort({ _id: -1 })
      .lean();
  },
  realms: async ({ name }) => {
    return await realms_db
      .find(
        { $text: { $search: name } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
  },
  item: async ({ id, extended }) => {
    if (!id || !id.includes('@')) {
      return
    }
    const [ itemQuery, realmQuery ] = id.split('@');
    const [ item, realms ] = await queryItemAndRealm(itemQuery, realmQuery);
    if (!item || !realms) return

    /** WoW Token */
    if (item._id === 122284 || item._id === 122270) {
      await wowtoken_db
        .find({ region: 'eu' })
        .limit(200)
        .sort({ _id: -1 })
        .lean()
        .then(wowtoken => Object.assign(item, { wowtoken: wowtoken }))
    }

    /** Add realms */
    item.realms = [ ...realms];
    const connected_realms_id = [...new Set(realms.map(({ connected_realm_id }) => connected_realm_id))]
    const xrs = connected_realms_id.length > 1

    const { valuations, chart, quotes, feed } = await itemExtended(item, connected_realms_id, extended)

    if (valuations && valuations.length) item.valuations = valuations

    if (extended) {
      item.chart = chart
      if (quotes && quotes.length) item.quotes = quotes
      if (feed && feed.length) item.feed = feed
    }
    item.xrs = xrs

    return item
  },
  createMessage: async ({ input }) => {
    return messages_db.create(input);
  },
  items: async ({ id }) => {
    if (!id || !id.includes('@')) return
    const [ itemQuery, realmQuery ] = id.split('@');

    return items_db.aggregate([
      {
        $match: { $text: { $search: itemQuery.toString() } },
      },
      {
        $addFields: {
          item_valuation: { $toInt: '$_id' },
          score: { $round: [ { $meta: "textScore" }, 2] },
        }
      },
      {
        $match: { score: { $gte: 1.5 } }
      },
      {
        $sort: { score: { $meta: "textScore" } }
      },
      {
        $limit: 250
      },
      {
        $lookup: {
          from: "realms",
          pipeline: [
            {
              $match: { $text: { $search: realmQuery.toString().replace(';', ' ') } }
            },
            {
              $group: {
                _id: "$connected_realm_id",
                realms: { $first: "$$ROOT" },
              }
            },
            { $replaceRoot: { newRoot: "$realms" } }
          ],
          as: "realms"
        }
      },
      {
        $lookup: {
          from: "valuations",
          let: { item_id: '$item_valuation', connected_realms: '$realms._id', valuations_timestamp: '$realms.valuations' }, //
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$item_id", "$$item_id"] },
                    { $ne: [ "$type", 'VENDOR'] },
                    { $in: ["$connected_realm_id", "$$connected_realms"] },
                    { $in: ["$last_modified", "$$valuations_timestamp"] }
                  ]
                }
              }
            }
          ],
          as: "valuations"
        }
      }
    ]);
  }
}

module.exports = root;
