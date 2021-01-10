/**
 * Mongo Models
 */
require('../../db/connection')
const keys_db = require('../../db/models/keys_db');
const realms_db = require('../../db/models/realms_db');
const auctions_db = require('../../db/models/auctions_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const BlizzAPI = require('blizzapi');
const { getAuctions } = require('./getAuctions');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param queryKeys {string}
 * @param bulkSize {number}
 * @returns {Promise<void>}
 */
const indexAuctions = async (queryKeys = `DMA`, bulkSize = 1) => {
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
            const snapshot = await getAuctions({ connected_realm_id: _id.connected_realm_id, timestamp: _id.timestamp, name: name }, api)
            if (snapshot.orders.length) {
              await auctions_db.insertMany(snapshot.orders, { rawResult: false});
              await realms_db.updateMany({ connected_realm_id: _id.connected_realm_id }, { auctions: snapshot.timestamp });
              console.info(`U,${_id.connected_realm_id}:${name},${snapshot.orders.length},${snapshot.timestamp}`)
            }
          } catch (error) {
            console.error(`E,${indexAuctions.name}:${error}`);
          }
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(`E,${indexAuctions.name}:${error}`);
  } finally {
    process.exit(0)
  }
};

schedule.scheduleJob('30,59 * * * *',() => {
  indexAuctions().then(r => r)
});
