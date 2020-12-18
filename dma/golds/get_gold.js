/**
 * Mongo Models
 */
require('../../db/connection')
const golds_db = require('../../db/models/golds_db');
const realms_db = require('../../db/models/realms_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const moment = require('moment');
const Xray = require('x-ray');
const makeDriver = require('request-x-ray');
const driver = makeDriver({
  method: 'GET',
  headers: { 'Accept-Language': 'en-GB,en;q=0.5' },
});
const x = Xray();
x.driver(driver);

/***
 * This function updates gold market data on every connected realm
 * @returns {Promise<void>}
 */

schedule.scheduleJob('00 * * * *', async () => {
  try {
    console.time(`DMA-getGoldData`);
    const ts = moment().format('X');
    const goldData = [];
    const goldOrders = await x('https://funpay.ru/chips/2/', '.tc-item', [
      {
        realm: '.tc-server', //@data-server num
        faction: '.tc-side', //@data-side 0/1
        status: '@data-online',
        quantity: '.tc-amount',
        owner: '.media-user-name',
        price: '.tc-price div',
      },
    ]).then(res => res);
    if (goldOrders.length !== 0) {
      for (let i = 0; i < goldOrders.length; i++) {
        const realm = await realms_db
          .findOne({ $text: { $search: goldOrders[i].realm } })
          .select('connected_realm_id')
          .lean();
        if (realm && realm.connected_realm_id) {
          await realms_db.updateMany(
            { connected_realm_id: realm.connected_realm_id },
            { golds: ts },
          );
          if (parseFloat(goldOrders[i].quantity.replace(/\s/g, '')) < 15000000) {
            goldData.push({
              connected_realm_id: realm.connected_realm_id,
              faction: goldOrders[i].faction,
              quantity: +goldOrders[i].quantity.replace(/\s/g, ''),
              status: goldOrders[i].status ? 'Online' : 'Offline',
              owner: goldOrders[i].owner,
              price: +goldOrders[i].price.replace(/ ₽/g, ''),
              last_modified: ts,
            });
          }
        }
      }
      await golds_db
        .insertMany(goldData)
        .then(golds => console.info(`U,${golds.length}`));
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.timeEnd(`DMA-getGoldData`);
    process.exit(0)
  }
});
