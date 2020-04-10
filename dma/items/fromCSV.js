const csv = require('csv');
const fs = require('fs');
const items_db = require("../../db/items_db");
const {connection} = require('mongoose');

async function fromCSV (path, expr) {
    try {
        let eva = fs.readFileSync(path,'utf8');
        csv.parse(eva, async function(err, data) {
            switch (expr) {
                case 'production':
                    console.log(data[0]);
                    for (let i = 1; i < data.length; i++) {
                        await items_db.findOneAndUpdate(
                            {
                                _id: parseFloat(data[i][0])
                            },
                            {
                                ticker: data[i][2],
                                asset_class: data[i][3],
                                profession_class: data[i][4],
                                expansion: data[i][5],
                            }
                        ).exec((err, item) => {
                            if (err) console.error(err);
                            console.info(item);
                        });
                    }
                    connection.close();
                    break;
                case 'dev':
                    console.info(data[0]);
                    for (let i = 1; i < 100; i++) {
                        console.info(data[i])
                    }
                    break;
                default:
                    console.info('Sorry, we got nothing');
            }
        });
    } catch (error) {
        console.error(error);
    }
}

fromCSV('C:\\bfa.csv', 'prod');