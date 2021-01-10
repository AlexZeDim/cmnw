/**
 * Mongo Models
 */
require('../../db/connection')
const keys_db = require('../../db/models/keys_db');
const items_db = require('../../db/models/items_db');

/**
 * Modules
 */
const getItem = require('./getItem');

/**
 * This function parse items across B.net API with wrapper
 * @param key {string}
 * @param parallel {number}
 * @param updateExisting {boolean}
 * @returns {Promise<void>}
 */

const indexItems = async (key = 'DMA', parallel = 10, updateExisting = false) => {
  try {
    console.time(`DMA-${indexItems.name}`);

    const { token } = await keys_db.findOne({ tags: key });

    if (updateExisting) {
      await items_db
        .find({ expansion: 'SHDW' })
        .lean()
        .cursor({ batchSize: parallel })
        .eachAsync(
          async ({ _id }) => {
            await getItem({ _id: _id, token: token, locale: 'en_GB' });
          },
          { parallel: parallel },
        );
    } else {
      for (let _id = 0; _id < 185000; _id++) {
        await getItem({ _id: _id, token: token, locale: 'en_GB' });
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-${indexItems.name}`);
    process.exit(0)
  }
}

//process.argv.slice(2)[0]
indexItems().then(r => r);
