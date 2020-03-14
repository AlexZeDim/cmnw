const golds_db = require("./../db/golds_db");
const realms_db = require("./../db/realms_db");
const {connection} = require('mongoose');
const moment = require('moment');
const Xray = require('x-ray');
const makeDriver = require('request-x-ray');
const driver = makeDriver({
    method: "GET",
    headers: {"Accept-Language": "en-GB,en;q=0.5"}
});
const x = Xray();
x.driver(driver);

async function getGoldData () {
    try {
        console.time(`DMA-${getGoldData.name}`);
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
                let realm = realms.find(({name, connected_realm_id}) => {
                    if (name === goldOrders[i].realm) return connected_realm_id
                });
                if (realm) {
                    goldData.push({
                        connected_realm_id: realm.connected_realm_id,
                        faction: goldOrders[i].faction,
                        quantity: +(goldOrders[i].quantity.replace(/\s/g,"")),
                        status: goldOrders[i].status ? 'Online' : 'Offline',
                        owner: goldOrders[i].owner,
                        price: +(goldOrders[i].price.replace(/ ₽/g,"")),
                        lastModified: moment().format()
                    });
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

getGoldData();