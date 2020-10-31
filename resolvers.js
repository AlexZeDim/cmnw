const character_db = require('./db/models/characters_db');
const guild_db = require('./db/models/guilds_db');
const realms_db = require('./db/models/realms_db');
const osint_logs_db = require('./db/models/osint_logs_db');
const keys_db = require('./db/models/keys_db');
const valuations_db = require('./db/models/valuations_db');
const auctions_db = require('./db/models/auctions_db');

const getCharacter = require('./osint/characters/get_character');
const getGuild = require('./osint/guilds/get_guild')
const queryItemAndRealm = require('./routes/api/handle_item_realm');
const iva = require('./dma/valuations/eva/iva.js');
const clusterChartData = require('./dma/valuations/cluster/cluster_chart.js');
const auctionsFeed = require('./dma/auctions/auctions_feed.js');
const auctionsData = require('./dma/auctions/auctions_data.js');
const goldsData = require('./dma/golds/gold_quotes.js');

const root = {
  character: async ({ id }) => {
    const character = await character_db.findById(id.toLowerCase());
    if (!character) {
      if (!id.includes('@')) {
        return
      }
      const [ nameSlug, realmSlug ] = id.split('@')

      const realm = await realms_db.findOne({ $text: { $search: realmSlug } }, { _id: 1, slug: 1, name: 1 });
      if (!realm) {
        return
      }
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getCharacter(
        { name: nameSlug, realm: { slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`},
        token,
        true,
        true
      );
      return await character_db.findById(id.toLowerCase());
    }
    character.logs = await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000)
    return character
  },
  guild: async ({ id }) => {
    const guild = await guild_db.findById(id.toLowerCase())
    if (!guild) {
      if (!id.includes('@')) {
        return
      }
      const [ nameSlug, realmSlug ] = id.split('@')

      const realm = await realms_db.findOne({ $text: { $search: realmSlug } }, { _id: 1, slug: 1, name: 1 });
      if (!realm) {
        return
      }
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getGuild(
        { name: nameSlug, realm: realm, createdBy: 'OSINT-userInput', updatedBy: 'OSINT-userInput' },
        token,
        true
      )
      return await guild_db.findById(id.toLowerCase())
    }
    return guild
  },
  item: async ({ id, valuations, chart, feed }) => {

    if (!id.includes('@')) {
      return
    }
    const [ itemQuery, realmQuery ] = id.split('@');
    const [ item, realm ] = await queryItemAndRealm(itemQuery, realmQuery);
    if (!item || !realm) {
      return
    }
    /** Commodity Block */
    let is_commdty = false;
    const arrayPromises = [];
    if (item.asset_class && item.asset_class.includes('COMMDTY')) {
      is_commdty = true;
    } else {
      if (item.stackable && item.stackable > 1) {
        is_commdty = true;
      }
      if (item._id === 122270 || item._id === 122284) {
        is_commdty = false
      }
    }
    if (item._id === 1) {
      is_commdty = true;
    }
    /** End of Commodity block */

    if (is_commdty) {
      if (chart) {``
        arrayPromises.push(
          clusterChartData(item._id, realm.connected_realm_id).then(chart =>
            Object.assign(item, { chart: chart }),
          ),
        );
      }

    } else {
      if (feed) {
        item.feed = await auctions_db.aggregate([
          {
            $match: {
              'item.id': item._id,
              'connected_realm_id': realm.connected_realm_id,
              'last_modified': realm.auctions,
            },
          },
          {
            $limit: 2000
          },
          {
            $lookup: {
              from: 'realms',
              localField: 'connected_realm_id',
              foreignField: 'connected_realm_id',
              as: 'connected_realm_id',
            },
          },
          {
            $addFields: {
              max_last_modified: {
                $arrayElemAt: ['$connected_realm_id.auctions', 0],
              },
            },
          },
          {
            $match: {
              $expr: { $eq: ['$last_modified', '$max_last_modified'] },
            },
          },
          {
            $addFields: {
              connected_realm_id: '$connected_realm_id.name_locale',
            },
          },
        ])
      }
    }

    if (valuations) {
      let valuations_ = await valuations_db
        .find({
          item_id: item._id,
          connected_realm_id: realm.connected_realm_id,
          last_modified: { $gte: realm.auctions },
        })
        .sort('value');
      if (!valuations_.length) {
        await iva(item, realm.connected_realm_id, realm.auctions, 0);
        valuations_ = await valuations_db
          .find({
            item_id: item._id,
            connected_realm_id: realm.connected_realm_id,
            last_modified: { $gte: realm.auctions },
          })
          .sort('value');
      }
      item.valuations = valuations_;
    }
    item.realm = realm;
    await Promise.allSettled(arrayPromises);
    return item
  }
}

module.exports = root;
