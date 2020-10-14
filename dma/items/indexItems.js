/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const keys_db = require('../../db/keys_db');
const items_db = require('../../db/items_db');

/**
 * Modules
 */
const getItem = require('./getItem');

/**
 * This function parse items across B.net API with wrapper
 * @param queryKeys {string}
 * @param operation {string}
 * @returns {Promise<void>}
 */

const indexItems = async (queryKeys = 'DMA', operation = 'create') => {
  try {
    console.time(`DMA-${indexItems.name}`);

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
      for (let _id = 145000; _id < 250000; _id++) {
        await getItem(_id, token);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-${indexItems.name}`);
  }
}

indexItems(process.argv.slice(2)[0], process.argv.slice(2)[1]);
