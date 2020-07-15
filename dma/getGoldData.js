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

const golds_db = require("./../db/golds_db");
const realms_db = require("./../db/realms_db");

/**
 * Modules
 */

const moment = require('moment');
const Xray = require('x-ray');
const makeDriver = require('request-x-ray');
const driver = makeDriver({
    method: "GET",
    headers: {"Accept-Language": "en-GB,en;q=0.5"}
});
const x = Xray();
x.driver(driver);

/***
 * This function updates gold market data on every connected realm
 * @returns {Promise<void>}
 */

async function getGoldData () {
    try {
        console.time(`DMA-${getGoldData.name}`);
        const t = moment().format();
        let goldData = [];
        let goldOrders = await x('https://funpay.ru/chips/2/', '.tc-item', [
            {
                realm: '.tc-server', //@data-server num
                faction: '.tc-side', //@data-side 0/1
                status: '@data-online',
                quantity: '.tc-amount',
                owner: '.media-user-name',
                price: '.tc-price div'
            }
        ]).then((res) => res);
        if (goldOrders.length !== 0) {
            const realms = await realms_db.find();
            for (let i = 0; i < goldOrders.length; i++) {
                //FIXME ????
                let realm = realms.find(({name, connected_realm_id}) => {
                    if (name === goldOrders[i].realm) return connected_realm_id
                });
                if (realm) {
                    if (parseFloat(goldOrders[i].quantity.replace(/\s/g,"")) < 15000000) {
                        goldData.push({
                            connected_realm_id: realm.connected_realm_id,
                            faction: goldOrders[i].faction,
                            quantity: +(goldOrders[i].quantity.replace(/\s/g,"")),
                            status: goldOrders[i].status ? 'Online' : 'Offline',
                            owner: goldOrders[i].owner,
                            price: +(goldOrders[i].price.replace(/ ₽/g,"")),
                            lastModified: t
                        });
                    }
                }
            }
            await golds_db.insertMany(goldData).then(golds => console.info(`U,${golds.length}`))
        }
        connection.close();
        console.timeEnd(`DMA-${getGoldData.name}`);
    } catch (err) {
        console.log(err);
    }
}

getGoldData().then(r => r);