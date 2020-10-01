/**
 * Mongo Models
 */
require('../db/connection')
const { connection } = require('mongoose');
const realms_db = require('./../db/realms_db');
const items_db = require('./../db/items_db');

/**
 * Modules
 */

const iva = require('./valuation/eva/iva');

/**
 * This function updated auction house data on every connected realm by ID (trade hubs)
 * @param realmQuery
 * @param bulkSize
 * @returns {Promise<void>}
 */

(async (
  realmQuery = { region: 'Europe' },
  bulkSize = 1,
) => {
  try {
    console.time(`DMA-getValuationsData`);
    await realms_db
      .aggregate([
        {
          $match: realmQuery,
        },
        {
          $group: {
            _id: '$connected_realm_id',
          },
        },
      ])
      .cursor({ batchSize: bulkSize })
      .exec()
      .eachAsync(
        async ({ _id }) => {
          try {
            const t = await realms_db.findOne({ connected_realm_id: _id }).select('auctions valuations').lean();
            /** If there are valuation records for certain realm, create it */
            if (!t.valuations) {
              await realms_db.updateMany(
                { connected_realm_id: _id },
                { valuations: 0 },
              );
            }
            /** Update valuations with new auctions data */
            if (t.auctions > t.valuations) {
              /**
               * @type {Map<number, {Object}>}
               */
              const assetClassMap = new Map([
                [0, { _id: 1 }],
                [1, { asset_class: 'WOWTOKEN' }],
                [
                  2,
                  {
                    $and: [
                      { expansion: 'BFA' },
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
                [
                  3,
                  {
                    $and: [
                      { expansion: 'BFA' },
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
                ],
                [
                  4,
                  {
                    $and: [
                      { expansion: 'BFA' },
                      {
                        asset_class: {
                          $all: ['REAGENT', 'DERIVATIVE'],
                        },
                      },
                    ],
                  },
                ],
                [
                  5,
                  {
                    $and: [
                      { expansion: 'BFA' },
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
                ],
                [
                  6,
                  {
                    $and: [
                      { expansion: 'BFA' },
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
                  .cursor({ batchSize: 10 })
                  .eachAsync(
                    async item => {
                      console.time(`DMA-${item._id}-${_id}:${item.name.en_GB}`);
                      await iva(item, _id, t.auctions, 0);
                      console.timeEnd(
                        `DMA-${item._id}-${_id}:${item.name.en_GB}`,
                      );
                    },
                    { parallel: 10 },
                  );
                console.timeEnd(`DMA-XVA-${_id}-${k}`);
              }
              /** Update timestamp for valuations */
              await realms_db.updateMany(
                { connected_realm_id: _id },
                { valuations: t.auctions },
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
    await connection.close();
    console.timeEnd(`DMA-getValuationsData`);
  }
})();
