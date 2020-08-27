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

const items_db = require('../../db/items_db');

/**
 * Build Tags for Items
 * @returns {Promise<void>}
 */

async function buildItemTags () {
  try {
    console.time(`DMA-${buildItemTags.name}`);
    let fields = ['expansion', 'ticker', 'profession_class', 'asset_class', 'item_class', 'item_subclass']
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
                    if (t === 'j') {
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
    connection.close();
    console.timeEnd(`DMA-${buildItemTags.name}`);
  } catch (err) {
    console.error(`${buildItemTags.name},${err}`);
  }
}

buildItemTags();
