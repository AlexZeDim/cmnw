const csv = require('csv');
const fs = require('fs');
const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');

async function fromCSV (path, expr) {
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
                    /***
                     * ID - recipe ID
                     * SkillLine - professionID
                     * Spell - spellID
                     * SupercedesSpell - determines RANK of currentSpell, supercedes weak rank
                     * MinSkillLineRank - require skill points
                     * Flags: 16 ??????
                     * NumSkillUps - pointsUP
                     * TrivialSkillLineRankHigh - greenCraftQ
                     * TrivialSkillLineRankLow - yellow craftQ
                     * SkillupSkillLineID represent subCategory in professions, for expansionTicker
                     *
                     * @type {*[]}
                     */
                    let SkillLineAbility = [];
                    for (let i = 1; i < L; i++) {
                        let row = {};
                        row.length = 0;
                        await Promise.all([data[i].map((row_value, i) => {
                            if (!isNaN(row_value)) {
                                row_value = parseInt(row_value)
                            }
                            Object.assign(row, {[data[0][i]]: row_value})
                        })]);
                        SkillLineAbility.push(row);
                    }
                    //TODO write from local or add to API
                    console.time('write');
                    let cursor = await professions_db.find({}).cursor();
                    cursor.on('data', async (craft_quene) => {
                        cursor.pause();
                        let profession_Q = SkillLineAbility.find(x => x.ID === craft_quene._id);
                        if (profession_Q.hasOwnProperty("Spell")) {
                            console.info(`${profession_Q.ID}=${craft_quene._id}:${craft_quene.profession}:${craft_quene.expansion}=>${profession_Q.Spell}`);
                            craft_quene.spell_id = profession_Q.Spell;
                        }
                        craft_quene.save();
                        cursor.resume();
                    });
                    cursor.on('close', async () => {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        connection.close();
                        console.timeEnd('write');
                    });

                    break;
                default:
                    console.log('Sorry, we got nothing');
            }
        });
    } catch (err) {
        console.log(err);
    }
}

fromCSV('C:\\skilllineability.csv', 'skilllineability');


