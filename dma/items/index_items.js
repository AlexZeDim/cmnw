/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const keys_db = require('../../db/models/keys_db');
const items_db = require('../../db/models/items_db');

/**
 * Modules
 */
const getItem = require('./get_item');

/**
 * This function parse items across B.net API with wrapper
 * @param queryKeys {string}
 * @param operation {string}
 * @returns {Promise<void>}
 */

const index_items = async (queryKeys = 'DMA', operation = 'create') => {
  try {
    console.time(`DMA-${index_items.name}`);

    const { token } = await keys_db.findOne({ tags: queryKeys });

    if (operation === 'update') {
      await items_db
        .find({})
        .lean()
        .cursor({ batchSize: 10 })
        .eachAsync(
          async ({ _id }) => {
            await getItem(_id, token);
          },
          { parallel: 10 },
        );
    } else {
      for (let _id = 145000; _id < 185000; _id++) {
        await getItem(_id, token);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-${index_items.name}`);
  }
}

index_items(process.argv.slice(2)[0], process.argv.slice(2)[1]);
