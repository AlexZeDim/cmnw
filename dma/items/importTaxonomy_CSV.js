/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const items_db = require('../../db/items_db');

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

const importTaxonomy_CSV = async (path = 'C:\\Projects\\conglomerat\\uploads\\taxonomy.csv') => {
  try {
    console.time(`DMA-${importTaxonomy_CSV.name}`);
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

    let fileSync = fs.readFileSync(path_, 'utf8');
    csv.parse(fileSync, async function (err, data) {
      switch (basename(path, '.csv')) {
        case 'taxonomy':
          for (let i = 1; i < data.length; i++) {
            let item = await items_db.findById(parseInt(data[i][0]));
            if (item) {
              if (data[i][2]) {
                item.ticker = data[i][2]
              }
              item.asset_class.addToSet(data[i][3]);
              await item.save();
              console.info(`U, ${parseFloat(data[i][0])}`);
            } else {
              console.info(`R, ${parseFloat(data[i][0])}`);
            }
          }
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
            console.info(
              `U, ${parseFloat(data[i][0])}, ${expansionTicker.get(
                parseInt(data[i][68]),
              )}, ${parseInt(data[i][32])}`,
            );
          }
          break;
        default:
          console.info('Sorry, we got nothing');
      }
    });
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`DMA-${importTaxonomy_CSV.name}`);
  }
}

importTaxonomy_CSV(process.argv.slice(2)[0]);
