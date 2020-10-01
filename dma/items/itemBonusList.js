/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const auctions_db = require('../../db/auctions_db');

/**
 * This function parse items across B.net API with wrapper
 * @returns {Promise<void>}
 */

(async (item_id = 175010) => {
  try {
    console.time(`DMA-itemBonusList`);

    const item = await auctions_db.aggregate([
      {
        $match: {
          'item.id': item_id,
        },
      },
      {
        $limit: 1,
      },
      {
        $lookup: {
          from: 'bonus_lists',
          localField: 'item.bonus_lists',
          foreignField: '_id',
          as: 'item.bonus_lists',
        },
      },
      {
        $lookup: {
          from: 'items',
          localField: 'item.id',
          foreignField: '_id',
          as: 'fromItems',
        },
      },
      {
        $addFields: {
          fromItems: { $arrayElemAt: ['$fromItems', 0] },
        },
      },
      {
        $addFields: {
          item: { $mergeObjects: ['$fromItems', '$item'] },
        },
      },
      {
        $project: {
          fromItems: 0,
        },
      },
    ]);
    console.log(item[0].item.bonus_lists);
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-itemBonusList`);
  }
})();
