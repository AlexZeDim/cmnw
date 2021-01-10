/**
 * Mongo Models
 */
require('../../db/connection')
const items_db = require('../../db/models/items_db');

/**
 * Modules
 */

const csv = require('csv');
const fs = require('fs');
const { basename, normalize } = require('path');

/***
 * This function allows Taxonomy to be imported up to the DMA-DB
 * @param path String path to csv file
 * @returns {Promise<void>}
 */

const buildTaxonomy = async (path = 'C:\\Projects\\conglomerat\\uploads\\taxonomy.csv') => {
  try {
    console.time(`DMA-${buildTaxonomy.name}`);
    let path_, file_;

    if (path.endsWith('.csv')) {
      file_ = path;
      path = path.slice(0, -4);
    } else {
      file_ = path + '.csv';
    }

    if (process.env.PWD) {
      path_ = normalize(`${process.env.PWD}/uploads/${file_}`);
    } else {
      path_ = file_;
    }

    const fileSync = fs.readFileSync(path_, 'utf8');
    await csv.parse(fileSync, async function (err, data) {
      switch (basename(path, '.csv')) {
        case 'taxonomy':
          for (let i = 1; i < data.length; i++) {
            const item = await items_db.findById(parseInt(data[i][0]));
            if (item) {
              if (data[i][2]) item.ticker = data[i][2]
              if (data[i][3]) item.profession_class = data[i][3];
              if (data[i][4]) {
                if (data[i][4].includes('.')) {
                  const asset_classes = data[i][4].split('.')
                  for (const asset_class of asset_classes) {
                    item.asset_class.addToSet(asset_class);
                  }
                } else {
                  item.asset_class.addToSet(data[i][4]);
                }
              }
              if (data[i][5]) {
                if (data[i][5].includes('.')) {
                  const tags = data[i][5].split('.')
                  for (const tag of tags) {
                    item.asset_class.addToSet(tag);
                  }
                } else {
                  item.asset_class.addToSet(data[i][5]);
                }
              }
              await item.save();
              console.info(`U,#${item._id}:${item.ticker || item.name.en_GB}:${item.profession_class} ${item.asset_class.toString()}`);
            } else {
              console.info(`R,#${parseInt(data[i][0])}:${data[i][1]}`);
            }
          }
          process.exit(0)
          break;
        case 'itemsparse':
          const expansionTicker = new Map([
            [8, 'SHDW'],
            [7, 'BFA'],
            [6, 'LGN'],
            [5, 'WOD'],
            [4, 'MOP'],
            [3, 'CATA'],
            [2, 'WOTLK'],
            [1, 'TBC'],
            [0, 'CLSC'],
          ]);
          for (let i = 1; i < data.length; i++) {
            await items_db.findByIdAndUpdate(parseFloat(data[i][0]), {
              expansion: expansionTicker.get(parseInt(data[i][68])),
              stackable: parseInt(data[i][32]),
            });
            console.info(`U, ${parseFloat(data[i][0])}, ${expansionTicker.get(parseInt(data[i][68]))}, ${parseInt(data[i][32])}`);
          }
          process.exit(0)
          break;
        default:
          console.info('Sorry, we got nothing');
      }
    });
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`DMA-${buildTaxonomy.name}`);
  }
}

buildTaxonomy(process.argv.slice(2)[0]).then(r => r);
