const csv = require('csv');
const fs = require('fs');
const items_db = require("../../db/items_db");

async function fromCSV (path, expr) {
    try {
        let is_yield;
        let eva = fs.readFileSync(path,'utf8');
        csv.parse(eva, async function(err, data) {
            switch (expr) {
                case 'prod':
                    console.log(data[0]);
                    for (let i = 1; i < data.length; i++) {
                        is_yield = data[i][6] !== 'FALSE';
                        await items_db.findOneAndUpdate(
                            {
                                _id: parseFloat(data[i][0])
                            },
                            {
                                ticker: data[i][2],
                                derivative: data[i][3],
                                asset_class: data[i][4],
                                expansion: data[i][5],
                                is_yield: is_yield,
                            }
                        ).exec(function (err, item) {
                            if (err) console.error(err);
                            console.info(item);
                        });

                    }
                    break;
                case 'test':
                    console.info(data[0]);
                    for (let i = 1; i < 100; i++) {
                        is_yield = data[i][6] !== 'FALSE';
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