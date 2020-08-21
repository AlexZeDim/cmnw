const pricing_methods = require('../../db/pricing_methods_db');

async function getPricingMethods(id = 15389, derivative = false) {
  try {
    let query = [{ type: 'primary', item_quantity: { $ne: 0 } }];
    if (derivative) {
      query.push({ type: 'derivative' });
    }
    return await pricing_methods.aggregate([
      {
        $match: {
          $or: [
            {
              alliance_item_id: id,
              $or: query,
            },
            {
              horde_item_id: id,
              $or: query,
            },
            {
              item_id: id,
              $or: query,
            },
          ],
        },
      },
      {
        $addFields: {
          item_id: {
            $filter: {
              input: ['$item_id', '$horde_item_id', '$alliance_item_id'],
              as: 'd',
              cond: {
                $ne: ['$$d', null],
              },
            },
          },
        },
      },
      {
        $unset: ['alliance_item_id', 'horde_item_id'],
      },
      {
        $unwind: {
          path: '$item_id',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$item_id',
          max: {
            $max: '$rank',
          },
          data: {
            $push: '$$ROOT',
          },
        },
      },
      {
        $unwind: '$data',
      },
      {
        $match: {
          $expr: {
            $or: [
              {
                $eq: [
                  {
                    $type: '$data.rank',
                  },
                  'missing',
                ],
              },
              { $eq: ['$data.rank', '$max'] },
            ],
          },
        },
      },
      {
        $replaceWith: '$data',
      },
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
    ]);
  } catch (err) {
    console.error(err);
  }
}

module.exports = getPricingMethods;
