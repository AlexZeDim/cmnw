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

schedule.scheduleJob('*/30 * * * *', async (
  t,
  queryKeys = { tags: `DMA` },
  realmQuery = { region: 'Europe' },
  bulkSize = 3,
) => {
  try {
    console.time(`DMA-getAuctionData`);
    const { _id, secret, token } = await keys_db.findOne(queryKeys);
    const api = new BlizzAPI({
      region: 'eu',
      clientId: _id,
      clientSecret: secret,
      accessToken: token
    });
    await realms_db
      .aggregate([
        {
          $match: realmQuery,
        },
        {
          $group: {
            _id: {
              connected_realm_id: '$connected_realm_id',
              timestamp: '$auctions',
            },
          },
        },
      ])
      .cursor({ batchSize: bulkSize })
      .exec()
      .eachAsync(
        async ({ _id }) => {
          try {
            console.info(`R,${_id.connected_realm_id}`);
            if (_id.timestamp) {
              _id.timestamp = `${moment.unix(_id.timestamp).utc().format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
            }
            let market = await api.query(`/data/wow/connected-realm/${_id.connected_realm_id}/auctions`, {
              timeout: 30000,
              params: { locale: 'en_GB' },
              headers: {
                'Battlenet-Namespace': 'dynamic-eu',
                'If-Modified-Since': _id.timestamp
              }
            }).catch(error => {
              console.info(`E,${_id.connected_realm_id}:${error}`);
              return void 0;
            });
            if (market && market.auctions && market.auctions.length) {
              let auctions = market.auctions;
              for (let i = 0; i < auctions.length; i++) {
                if ('item' in auctions[i]) {
                  /** Pet fix */
                  if (auctions[i].item.id && auctions[i].item.id === 82800) {
                    if (auctions[i].item.modifiers && auctions[i].item.modifiers.length) {
                      const display_id = auctions[i].item.modifiers.find(m => m.type === 6);
                      if (display_id) {
                        let pet = await pets_db.findOne({display_id: display_id.value})
                        if (pet) {
                          auctions[i].item.id = pet.item_id;
                        }
                      }
                    }
                  }
                }
                if ('bid' in auctions[i])
                  auctions[i].bid = Round2(auctions[i].bid / 10000);
                if ('buyout' in auctions[i])
                  auctions[i].buyout = Round2(auctions[i].buyout / 10000);
                if ('unit_price' in auctions[i])
                  auctions[i].unit_price = Round2(
                    auctions[i].unit_price / 10000,
                  );
                auctions[i].connected_realm_id = _id.connected_realm_id;
                auctions[i].last_modified = moment(
                  new Date(market.lastModified),
                ).format('X');
              }
              await auctions_db.insertMany(auctions).then(auctions => {
                console.info(`U,${_id.connected_realm_id},${auctions.length}`);
              });
              await realms_db.updateMany(
                { connected_realm_id: _id.connected_realm_id },
                {
                  auctions: moment(new Date(market.lastModified)).format('X'),
                },
              );
            }
          } catch (error) {
            console.error(error);
          }
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-getAuctionData`);
  }
});
