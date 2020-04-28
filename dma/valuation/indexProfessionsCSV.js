const professions_db = require("../../db/professions_db");
const {connection} = require('mongoose');
const fromCSV = require('./fromCSV');

async function indexProfessionsCSV () {
    try {
        console.time(indexProfessionsCSV.name);
        //TODO cursor
        const test = await fromCSV('C:\\skilllineability.csv', 'skilllineability');
        console.log(test);
/*        let craft_queries = await professions_db.find({}).cursor();
        for (let craft_quene = await craft_queries.next(); craft_quene != null; craft_quene = await craft_queries.next()) {
            console.log(craft_quene._id);
        }
        connection.close();*/
        console.timeEnd(indexProfessionsCSV.name);
    } catch (err) {
        console.log(err);
    }
}

indexProfessionsCSV();