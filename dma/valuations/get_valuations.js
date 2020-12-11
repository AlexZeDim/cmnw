/**
 * Mongo Models
 */
require('../../db/connection')
const realms_db = require('../../db/models/realms_db');
const items_db = require('../../db/models/items_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const evaluate = require('./eva/evaluate');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param realmQuery
 * @param bulkSize
 * @returns {Promise<void>}
 */

schedule.scheduleJob('01,16,31,46 * * * *', async (
  t,
  realmQuery = 'Europe',
  bulkSize = 2,
) => {
  try {
    console.time(`DMA-getValuationsData`);
    await realms_db
      .aggregate([
        {
          $match: { region: realmQuery },
        },
        {
          $group: {
            _id: '$connected_realm_id',
            auctions: { $first: "$auctions" },
            valuations: { $first: "$valuations" }
          },
        },
      ])
      .cursor({ batchSize: bulkSize })
      .exec()
      .eachAsync(
        async ({ _id, auctions, valuations }) => {
          try {
            /** Update valuations with new auctions data */
            if (auctions > valuations) {
              /**
               * @type {Map<number, {Object}>}
               */
              const assetClassMap = new Map([
                [0, { _id: 1 }],
                [1, { asset_class: 'WOWTOKEN' }],
                [2,
                  {
                    $and: [
                      { expansion: 'SHDW' },
                      {
                        asset_class: {
                          $nin: ['DERIVATIVE', 'PREMIUM'],
                        },
                      },
                      {
                        asset_class: {
                          $all: ['REAGENT', 'MARKET', 'COMMDTY'],
                        },
                      },
                    ],
                  },
                ],
                /*[3,
                  {
                    $and: [
                      { expansion: 'SHDW' },
                      {
                        asset_class: {
                          $nin: ['DERIVATIVE'],
                        },
                      },
                      {
                        asset_class: {
                          $all: ['REAGENT', 'PREMIUM'],
                        },
                      },
                    ],
                  },
                ],*/
                [3,
                  {
                    $and: [
                      { expansion: 'SHDW' },
                      {
                        asset_class: {
                          $all: ['REAGENT', 'DERIVATIVE'],
                        },
                      },
                    ],
                  },
                ],
                /*[4,
                  {
                    $and: [
                      { expansion: 'SHDW' },
                      {
                        asset_class: {
                          $nin: ['DERIVATIVE'],
                        },
                      },
                      {
                        asset_class: {
                          $all: ['REAGENT', 'PREMIUM'],
                        },
                      },
                    ],
                  },
                ],*/
                [4,
                  {
                    $and: [
                      { expansion: 'SHDW' },
                      {
                        asset_class: {
                          $nin: ['REAGENT'],
                        },
                      },
                      { asset_class: 'DERIVATIVE' },
                    ],
                  },
                ],
              ]);
              /**
               * Start to evaluate every item class with selected item_db query
               */
              for (let [k, ac] of assetClassMap) {
                /**
                 * Starting IVA as 10 streams
                 */
                console.time(`DMA-XVA-${_id}-${k}`);
                await items_db
                  .find(ac)
                  .lean()
                  .cursor({ batchSize: 5 })
                  .eachAsync(
                    async item => {
                      console.time(`DMA-${item._id}-${_id}:${item.name.en_GB}`);
                      item.connected_realm_id = _id;
                      item.last_modified = auctions;
                      item.iterations = 0;
                      await evaluate(item);
                      console.timeEnd(`DMA-${item._id}-${_id}:${item.name.en_GB}`);
                    },
                    { parallel: 5 },
                  );
                console.timeEnd(`DMA-XVA-${_id}-${k}`);
              }
              /** Update timestamp for valuations */
              await realms_db.updateMany(
                { connected_realm_id: _id },
                { valuations: auctions },
              );
            }
          } catch (e) {
            console.error(e);
          }
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-getValuationsData`);
    process.exit(0)
  }
});
