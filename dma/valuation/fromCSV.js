const csv = require('csv');
const fs = require('fs');
//const professions_db = require("../../../db/models/professions_db");

async function getValuation (path, expr) {
    try {
        let eva = fs.readFileSync(path,'utf8');
        csv.parse(eva, async function(err, data) {
            const L = data.length;
            switch (expr) {
                case 'spelleffect':
                    for (let i = 1; i < 3; i++) {
                        let row = {};
                        row.length = 0;
                        await Promise.all([data[i].map((row_value, i) => {
                            if (!isNaN(row_value)) {
                                row_value = parseInt(row_value)
                            }
                            Object.assign(row, {[data[0][i]]: row_value})
                        })]);
                        console.log(row);
                    }
                    break;
                case 'spellreagents':
                    let array = [];
                    //TODO find it by headers
                    let reagentsIndex = [2, 3, 4, 5, 6, 7, 8, 9];
                    let quantityIndex = [10, 11, 12, 13, 14, 15, 16, 17];
                    //console.log(data[0]); headers
                    for (let i = 1; i < 3; i++) {
                        let row = {};
                        row.length = 0;

                        let row_reagentArray = [];

                        for (let r = 0; r < reagentsIndex.length; r++) {
                            if (data[i][reagentsIndex[r]] !== '0') {
                                let row_reagent = {};
                                row_reagent._id = parseInt(data[i][reagentsIndex[r]]);
                                row_reagent.quantity = parseInt(data[i][quantityIndex[r]]);
                                row_reagentArray.push(row_reagent)
                            }
                        }
                        //TODO find by spell_id and array = 0;
                        console.log({
                            spell_id: parseInt(data[i][1]),
                            reagents: row_reagentArray
                        });
                    }
/*                    console.log(array);
                    for (let i = 0; i < array.length; i++) {
                        let test = await valuations_db.findOneAndUpdate(
                            {
                                _id: array[i]._id
                            },
                            {
                                reagents: array[i].reagents,
                                quantity: array[i].quantity,
                                spell_id: array[i].spell_id,
                            }, {
                                upsert: true,
                                new: true,
                                lean: true
                            });
                        console.log(test);
                    }*/
                    //valuations_db.insertMany(array);
                    break;
                case 'skilllineability':
                    for (let i = 1; i < data.length; i++) {
                        if (parseFloat(data[i][6]) === 0) {
                            let item = await valuations_db.findOneAndUpdate({spell_id: parseFloat(data[i][3])}, {rank: 1});
                            console.log(item)
                        } else {
                            console.log(parseFloat(data[i][3]),parseFloat(data[i][6])); //if exist in valuation && rank 1
                            let r2 = await valuations_db.findOne({spell_id: parseFloat(data[i][6]), rank: 1});
                            if (r2 !== null) {
                                let item = await valuations_db.findOneAndUpdate({spell_id: parseFloat(data[i][3])}, {rank: 2});
                                console.log(item)
                            }
                            let r3 = await valuations_db.findOne({spell_id: parseFloat(data[i][6]), rank: 2});
                            if (r3 !== null) {
                                let item = await valuations_db.findOneAndUpdate({spell_id: parseFloat(data[i][3])}, {rank: 3});
                                console.log(item)
                            }
                        }
                    }
                    break;
                case 'eva_import':
                    for (let i = 1; i < data.length; i++) {
                        let item = await valuations_db.findOneAndUpdate(
                            {
                                _id: 99999-i //id
                            },
                            {
                                reagents: [parseFloat(data[i][1])],
                                quantity: [parseFloat(data[i][2])],
                                spell_id: parseFloat(data[i][3]),
                                item_id: parseFloat(data[i][4]),
                                rank: parseFloat(data[i][5]),
                                item_quantity: parseFloat(data[i][6]),
                            },{
                                upsert : true,
                                new: true,
                                lean: true
                            });
                        console.log(item)
                    }
                    break;
                default:
                    console.log('Sorry, we got nothing');
            }
        });
    } catch (err) {
        console.log(err);
    }
}

getValuation('C:\\spellreagents.csv', 'spellreagents');





