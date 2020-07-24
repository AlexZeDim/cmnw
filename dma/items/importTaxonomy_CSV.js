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

/***
 * This function allows Taxonomy to be imported up to the DMA-DB
 * @param path
 * @param expr
 * @returns {Promise<void>}
 */

async function importTaxonomy_CSV (path, expr) {
    try {
        let eva = fs.readFileSync(path,'utf8');
        csv.parse(eva, async function(err, data) {
            switch (expr) {
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
                        await items_db.findByIdAndUpdate(parseFloat(data[i][0]), { expansion: expansionTicker.get(parseInt(data[i][68])) })
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

importTaxonomy_CSV('C:\\itemsparse.csv', 'itemsparse');