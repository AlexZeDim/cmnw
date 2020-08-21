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

const pricing_methods = require('../../db/pricing_methods_db');

/**
 * This function add reagent_items field
 * @returns {Promise<void>}
 */

async function indexMethodsReagentItems() {
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
      console.log(method);
      cursor.resume();
    });
    cursor.on('close', async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      connection.close();
    });
  } catch (err) {
    console.error(err);
  }
}

indexMethodsReagentItems();
