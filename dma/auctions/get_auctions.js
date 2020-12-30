/**
 * Mongo Models
 */
require('../../db/connection')
const keys_db = require('../../db/models/keys_db');
const realms_db = require('../../db/models/realms_db');
const auctions_db = require('../../db/models/auctions_db');
const pets_db = require('../../db/models/pets_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const BlizzAPI = require('blizzapi');
const moment = require('moment');
const { Round2 } = require('../../db/setters');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param queryKeys
 * @param realmQuery
 * @param bulkSize
 * @returns {Promise<void>}
 */
schedule.scheduleJob('30,59 * * * *', async (
  t,
  queryKeys = `DMA`,
  bulkSize = 1,
) => {
  try {
    const { _id, secret, token } = await keys_db.findOne({ tags: queryKeys });
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });
    await realms_db
      .aggregate([
        {
          $group: {
            _id: {
              connected_realm_id: '$connected_realm_id',
              timestamp: '$auctions',
            },
            name: { $first: "$name" }
          },
        },
      ])
      .cursor({ batchSize: bulkSize })
      .exec()
      .eachAsync(
        async ({ _id, name }) => {
          try {
            const time = new Date().getTime();
            console.time(`DMA-getAuctionData-${time}:${_id.connected_realm_id}`);
            console.info(`R,${_id.connected_realm_id},${name}`);
            if (_id.timestamp) _id.timestamp = `${moment.unix(_id.timestamp).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
            const market = await api.query(`/data/wow/connected-realm/${_id.connected_realm_id}/auctions`, {
              timeout: 30000,
              params: { locale: 'en_GB' },
              headers: {
                'Battlenet-Namespace': 'dynamic-eu',
                'If-Modified-Since': _id.timestamp
              }
            }).catch(error => console.info(`E,${_id.connected_realm_id},${name}:${error}`));
            if (market && market.auctions && market.auctions.length) {
              const last_modified = moment(new Date(market.lastModified)).format('X')
              const orders = await Promise.all(market.auctions.map(async order => {
                if (order.item) {
                  /** Pet fix */
                  if (order.item.id && order.item.id === 82800) {
                    if (order.item.modifiers && order.item.modifiers.length) {
                      const display_id = order.item.modifiers.find(m => m.type === 6);
                      if (display_id && display_id.value) {
                        const pet = await pets_db.findOne({ display_id: display_id.value }).lean().exec()
                        if (pet && pet.item_id) order.item.id = pet.item_id
                      }
                    }
                  }
                }
                if (order.bid) order.bid = Round2(order.bid / 10000);
                if (order.buyout) order.buyout = Round2(order.buyout / 10000);
                if (order.unit_price) order.unit_price = Round2(order.unit_price / 10000);
                order.connected_realm_id = _id.connected_realm_id;
                order.last_modified = last_modified;
                return order
              }))
              await auctions_db.insertMany(orders).then(auctions => console.info(`U,${_id.connected_realm_id},${auctions.length},${name}`));
              await realms_db.updateMany({ connected_realm_id: _id.connected_realm_id }, { auctions: last_modified });
            }
            console.timeEnd(`DMA-getAuctionData-${time}:${_id.connected_realm_id}`);
          } catch (error) {
            console.error(error);
          }
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0)
  }
});
