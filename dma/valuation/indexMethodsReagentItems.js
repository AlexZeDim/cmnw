/**
 * Mongo Models
 */
require('../../db/connection')
const pricing_methods = require('../../db/models/pricing_methods_db');

/**
 * This function add reagent_items field
 * @returns {Promise<void>}
 */

(async () => {
  try {
    let cursor = await pricing_methods
      .aggregate([
        {
          $lookup: {
            from: 'items',
            localField: 'reagents._id',
            foreignField: '_id',
            as: 'reagent_items',
          },
        },
        {
          $addFields: {
            reagent_items: {
              $map: {
                input: '$reagent_items',
                as: 'ri',
                in: {
                  $mergeObjects: [
                    '$$ri',
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$reagents',
                            cond: {
                              $eq: ['$$this._id', '$$ri._id'],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ])
      .cursor({ batchSize: 1 })
      .exec();
    cursor.on('data', async pricing_method => {
      cursor.pause();
      let method = await pricing_methods.findByIdAndUpdate(
        pricing_method._id,
        pricing_method,
      );
      console.info(method);
      cursor.resume();
    });
    cursor.on('close', async () => {
      await process.exit(0)
    })
  } catch (error) {
    console.error(error);
  }
})();
