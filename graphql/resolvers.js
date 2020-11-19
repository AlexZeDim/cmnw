const characters_db = require('../db/models/characters_db');
const guilds_db = require('../db/models/guilds_db');
const realms_db = require('../db/models/realms_db');
const osint_logs_db = require('../db/models/osint_logs_db');
const keys_db = require('../db/models/keys_db');
const valuations_db = require('../db/models/valuations_db');
const auctions_db = require('../db/models/auctions_db');
const golds_db = require('../db/models/golds_db');
const wowtoken_db = require('../db/models/wowtoken_db');
const messages_db = require('../db/models/messages_db');

const getCharacter = require('../osint/characters/get_character');
const getGuild = require('../osint/guilds/get_guild')
const queryItemAndRealm = require('./handle_item_realm');
const iva = require('../dma/valuations/eva/iva.js');
const clusterChartData = require('../dma/valuations/cluster/cluster_chart.js');
const itemXRS = require('../dma/valuations/cluster/item_xrs.js');

const root = {
  character: async ({ id }) => {
    if (!id.includes('@')) {
      return
    }
    const [ nameSlug, realmSlug ] = id.split('@');
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) {
      return
    }
    const character = await characters_db.findById(`${nameSlug.toLowerCase()}@${realm.slug}`).lean();
    if (!character) {
      const { token } = await keys_db.findOne({
        tags: `OSINT-indexCharacters`,
      });
      await getCharacter(
        { name: nameSlug, realm: { slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`},
        token,
        true,
        true
      );
      return await characters_db.findById(`${nameSlug.toLowerCase()}@${realm.slug}`).lean();
    }
    character.logs = await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000)
    return character
  },
  guild: async ({ id }) => {
    if (!id.includes('@')) {
      return
    }
    const [ nameSlug, realmSlug ] = id.split('@');
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) {
      return
    }
    const [guild] = await guilds_db.aggregate([
      {
        $match: {
          _id: `${nameSlug.toLowerCase()}@${realm.slug}`,
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
      await getGuild(
        { name: nameSlug, realm: realm, createdBy: 'OSINT-userInput', updatedBy: 'OSINT-userInput' },
        token,
        true
      )
      return await guilds_db.aggregate([
        {
          $match: {
            _id: `${nameSlug.toLowerCase()}@${realm.slug}`,
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
      ]).allowDiskUse(true).exec()[0];
    }
    return guild
  },
  hash: async ({ query }) => {
    if (!query.includes('@')) {
      return
    }
    const [ type, hash ] = query.split("@")
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
  item: async ({ id, valuations, webpage }) => {

    if (!id.includes('@')) {
      return
    }
    const [ itemQuery, realmQuery ] = id.split('@');
    const [ item, realm ] = await queryItemAndRealm(itemQuery, realmQuery);
    if (!item || !realm) {
      return
    }

    if (webpage) {
      /** Commodity Block */
      let is_commdty = false;
      const arrayPromises = [];
      if (item.asset_class && item.asset_class.includes('COMMDTY')) {
        is_commdty = true;
      }
      if (item.stackable && item.stackable > 1) {
        is_commdty = true;
      }
      if (item._id === 1) {
        /** GOLD */
        is_commdty = true;
        arrayPromises.push(
          golds_db.aggregate([
            {
              $match: {
                status: 'Online',
                connected_realm_id: realm.connected_realm_id,
                last_modified: realm.golds,
              },
            },
            {
              $project: {
                id: '$id',
                quantity: '$quantity',
                price: '$price',
                owner: '$owner',
              },
            },
            {
              $group: {
                _id: '$price',
                quantity: { $sum: '$quantity' },
                open_interest: {
                  $sum: {
                    $multiply: ['$price', { $divide: ['$quantity', 1000] }],
                  },
                },
                sellers: { $addToSet: '$owner' },
              },
            },
            {
              $sort: { _id: 1 },
            },
            {
              $project: {
                _id: 0,
                price: '$_id',
                quantity: '$quantity',
                open_interest: '$open_interest',
                size: {
                  $cond: {
                    if: { $isArray: '$sellers' },
                    then: { $size: '$sellers' },
                    else: 0,
                  },
                },
              },
            },
          ]).then(quotes => Object.assign(item, { quotes: quotes }))
        )
      } else if (item._id === 122270 || item._id === 122284) {
        /** WT */
        is_commdty = false;
        arrayPromises.push(
          wowtoken_db
            .find({ region: 'eu' })
            .limit(200)
            .sort({ _id: -1 })
            .lean()
            .then(wowtoken => Object.assign(item, { wowtoken: wowtoken })),
        );
      } else {
        /** ANY ITEM */
        arrayPromises.push(
          auctions_db.aggregate([
            {
              $match: {
                'last_modified': realm.auctions,
                'item.id': item._id,
                'connected_realm_id': realm.connected_realm_id,
              },
            },
            {
              $project: {
                id: '$id',
                quantity: '$quantity',
                price: {
                  $ifNull: ['$buyout', { $ifNull: ['$bid', '$unit_price'] }],
                },
              },
            },
            {
              $group: {
                _id: '$price',
                quantity: { $sum: '$quantity' },
                open_interest: {
                  $sum: { $multiply: ['$price', '$quantity'] },
                },
                orders: { $addToSet: '$id' },
              },
            },
            {
              $sort: { _id: 1 },
            },
            {
              $project: {
                _id: 0,
                price: '$_id',
                quantity: '$quantity',
                open_interest: '$open_interest',
                size: {
                  $cond: {
                    if: { $isArray: '$orders' },
                    then: { $size: '$orders' },
                    else: 0,
                  },
                },
              },
            },
          ]).then(quotes => Object.assign(item, { quotes: quotes }))
        )
      }
      /** End of Commodity block */

      if (is_commdty) {
        arrayPromises.push(
          clusterChartData(item._id, realm.connected_realm_id).then(chart =>
            Object.assign(item, { chart: chart }),
          ),
        );
      } else {
        arrayPromises.push(
          auctions_db.aggregate([
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
          ]).then(feed => Object.assign(item, { feed: feed }))
        );
      }
      /** Handle all promises for webpage */
      await Promise.allSettled(arrayPromises);
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
    return item
  },
  item_xrs: async ({ id }) => {
    if (!id) {
      return
    }
    const [ item ] = await queryItemAndRealm(id);
    if (!item) {
      return
    }
    const { valuations, y_axis, x_axis, dataset } = await itemXRS(item._id)
    item.valuations = valuations;
    item.chart = {
      y_axis: y_axis,
      x_axis: x_axis,
      dataset: dataset
    }
    return item
  },
  createMessage: async ({ input }) => {
    return messages_db.create(input);
  },
}

module.exports = root;
