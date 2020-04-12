const realms_db = require("./../db/realms_db");
const moment = require('moment');
const fs = require('fs');
const S = require('string');
const {connection} = require('mongoose');

async function exportTSM (arg_realm) {
    try {
        let order_log = [];
        let venue;
        const flags = new Map([
            ['B', 'Buys'],
            ['S', 'Sales'],
        ]);
        const server = await realms_db.findOne({$or: [
                { 'name': arg_realm },
                { 'slug': arg_realm },
                { 'name_locale': arg_realm },
            ]
        }).exec();
        console.time(`${exportTSM.name}`);
        //TODO path to file
        let TSM_sales = fs.readFileSync('C:\\Games\\World of Warcraft\\_retail_\\WTF\\Account\\ALEXZEDIM\\SavedVariables\\TradeSkillMaster.lua','utf8');
        //TODO matching pattern \\ both buys and sells, also it's fucking CSV!
        for (let flag of flags[Symbol.iterator]()) {
            let text = S(TSM_sales).between(`\t["r@${server.name_locale}@internalData@csv${flag[1]}"] =`, '\n\t').replaceAll('"', '').replaceAll(' ', '').replaceAll('\\n', '\n').s;
            let array = S(text).lines();
            for (let i = 0; i < array.length; i++) {
                if (array[i].endsWith('Trade') || array[i].endsWith('Auction') === true) {
                    let element = array[i].split(',');
                    let id = element[0].split(':')[1];
                    if (element[7] === 'Auction') venue = 'AH';
                    if (element[7] === 'Trade') venue = 'OTC';
                    let deal = {
                        instrument: parseFloat(id),
                        flag: flag[0],
                        venue: venue,
                        tags: [`${exportTSM.name}`],
                        currency: 'g',
                        price: parseFloat((element[3] / 10000).toFixed(2)),
                        quantity: parseFloat(element[2]),
                        status: 'F',
                        value: parseFloat(((element[3]* element[2]) / 10000).toFixed(2)) ,
                        counterparty: element[4],
                        realm: server.name,
                        trading_day: moment.unix(element[6]).toISOString()
                    };
                    order_log.push(deal);
                }
            }
        }
        console.log(`Found ${order_log.length} deals, from: ${order_log[0].trading_day}, to: ${order_log[order_log.length-1].trading_day}`);
/*        let file_buffer = Buffer.from(JSON.stringify(order_log), null, 4);
        await fs.writeFile('order_log.json', file_buffer, 'utf8',function(err){
            if(err) throw err;
        });*/
        connection.close();
        console.timeEnd(`${exportTSM.name}`);
        return order_log;
    } catch (err) {
        console.error(err);
    }
}

exportTSM('Gordunni');

module.exports = exportTSM;