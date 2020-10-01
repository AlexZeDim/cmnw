/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const items_db = require('../../db/items_db');

/**
 * Build Tags for Items
 * @returns {Promise<void>}
 */

(async () => {
  try {
    console.time(`DMA-buildItemTags`);
    let fields = ['expansion', 'ticker', 'profession_class', 'asset_class', 'item_class', 'item_subclass', 'quality']
    await items_db
      .find({})
      .cursor({ batchSize: 10 })
      .eachAsync(
        async (item) => {
          for (let field of fields) {
            if (item[field]) {
              if (Array.isArray(item[field])) {
                item[field].map(as => item.tags.addToSet(as.toLowerCase()))
              } else {
                if (field === 'ticker') {
                  item[field].split('.').map(t => {
                    t = t.toLowerCase();
                    if (t === 'j' || t === 'petal' || t === 'nugget') {
                      item.tags.addToSet('junior')
                    }
                    item.tags.addToSet(t)
                  })
                } else {
                  item.tags.addToSet(item[field].toLowerCase())
                }
              }
            }
          }
          await item.save()
          console.info(`${item._id},tags build: ${item.tags.join()}`)
        },
        { parallel: 10 },
      )
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-buildItemTags`);
  }
})();
