/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const keys_db = require('./../db/keys_db');
const realms_db = require('./../db/realms_db');
const auctions_db = require('./../db/auctions_db');

/**
 * B.net wrapper
 */
const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const moment = require('moment');
const { Round2 } = require('../db/setters');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param queryKeys
 * @param realmQuery
 * @param bulkSize
 * @returns {Promise<void>}
 */

async function getAuctionData(
  queryKeys = { tags: `DMA` },
  realmQuery = { region: 'Europe' },
  bulkSize = 2,
) {
  try {
    console.time(`DMA-${getAuctionData.name}`);
    const { _id, secret, token } = await keys_db.findOne(queryKeys);
    const bnw = new battleNetWrapper();
    await bnw.init(_id, secret, token, 'eu', 'en_GB');
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
              _id.timestamp = `${moment
                .unix(_id.timestamp)
                .utc()
                .format('ddd, DD MMM YYYY HH:mm:ss')} GMT`;
            }
            let {
              auctions,
              lastModified,
            } = await bnw.WowGameData.getAuctionHouse(
              _id.connected_realm_id,
              _id.timestamp,
            ).catch(e => {
              console.info(`E,${_id.connected_realm_id}:${e}`);
              return e;
            });
            if (auctions && auctions.length) {
              for (let i = 0; i < auctions.length; i++) {
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
                  new Date(lastModified),
                ).format('X');
              }
              await auctions_db.insertMany(auctions).then(auctions => {
                console.info(`U,${_id.connected_realm_id},${auctions.length}`);
              });
              await realms_db.updateMany(
                { connected_realm_id: _id.connected_realm_id },
                {
                  auctions: moment(new Date(lastModified)).format('X'),
                },
              );
            }
          } catch (e) {
            console.error(e);
          }
        },
        { parallel: bulkSize },
      );
    connection.close();
    console.timeEnd(`DMA-${getAuctionData.name}`);
  } catch (err) {
    console.error(`${getAuctionData.name},${err}`);
  }
}

getAuctionData();
