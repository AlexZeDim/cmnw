const fs = require('fs');
const guild_db = require("../db/guilds_db");

async function myReadfile (path) {
    try {
        let str = await fs.readFileSync(path,'utf8');
        let obj = JSON.parse(str);
        let guild_array = [];
        for (let i = 0; i < obj.length; i++) {
            guild_array.push({_id: `${obj[i].name.toLowerCase().replace(/\s/g,"-")}@gordunni`, slug: obj[i].name.toLowerCase().replace(/\s/g,"-"), realm: `gordunni`});
        }
        guild_db.insertMany(guild_array)
    }
    catch (err) {
        console.error( err )
    }
};

myReadfile('C:\\Users\\AlexZ\\Downloads\\eu_гордунни_tier26.json');