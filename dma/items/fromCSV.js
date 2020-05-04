const csv = require('csv');
const fs = require('fs');
const items_db = require("../../db/items_db");

async function fromCSV (path, expr) {
    try {
        let eva = fs.readFileSync(path,'utf8');
        csv.parse(eva, async function(err, data) {
            switch (expr) {
                case 'production':
                    for (let i = 1; i < data.length; i++) {
                        await items_db.findOneAndUpdate(
                            {
                                _id: parseFloat(data[i][0])
                            },
                            {
                                ticker: data[i][2],
                                profession_class: data[i][3],
                                expansion: data[i][4],
                                v_class: [data[i][5], data[i][6], data[i][7]]
                            }
                        ).exec((err, item) => {
                            if (err) console.error(err);
                            console.info(item);
                        });
                    }
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

fromCSV('C:\\SHDW.csv', 'production');