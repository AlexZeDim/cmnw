/**
 * Connection with DB
 */

const {connect, connection} = require('mongoose');
require('dotenv').config();
connect(`mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: "majority",
    family: 4
});

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));

/**
 * Model importing
 */

const items_db = require("../../db/items_db");

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

async function importTaxonomy_CSV (path = 'C:\\itemsparse.csv') {
    try {
        let path_, file_;

        if (path.endsWith(".csv")) {
            file_ = path
            path = path.slice(0, -4)
        } else {
            file_ = path + '.csv'
        }

        if (process.env.PWD) {
            path_ = normalize(`${process.env.PWD}/uploads/${file_}`)
        } else {
            path_ = file_
        }

        let fileSync = fs.readFileSync(path_,'utf8');
        csv.parse(fileSync, async function(err, data) {
            switch (basename(path, '.csv')) {
                case 'production':
                    for (let i = 1; i < data.length; i++) {
                        let item = await items_db.findById(parseInt(data[i][0]))
                        item.ticker = data[i][2];
                        item.profession_class = data[i][3];
                        item.asset_class.addToSet()
                        await item.save()
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
                        [0, 'CLSC']
                    ]);
                    for (let i = 1; i < data.length; i++) {
                        await items_db.findByIdAndUpdate(parseFloat(data[i][0]), { expansion: expansionTicker.get(parseInt(data[i][68])), stackable: parseInt(data[i][32]) })
                        console.info(`U, ${parseFloat(data[i][0])}, ${expansionTicker.get(parseInt(data[i][68]))}, ${parseInt(data[i][32])}`);
                    }
                    break;
                default:
                    console.info('Sorry, we got nothing');
            }
            connection.close();
        });
    } catch (error) {
        console.error(error);
    }
}

importTaxonomy_CSV(process.env.PWD);