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



/***
 * This function updates gold market data on every connected realm
 * @returns {Promise<void>}
 */

const indexGold = async () => {
  try {
    console.time(`DMA-getGoldData`);
    const timestamp = moment().format('X');
    const x = Xray();
    const driver = makeDriver({
      method: 'GET',
      headers: { 'Accept-Language': 'en-GB,en;q=0.5' },
    });
    x.driver(driver);

    const listing = await x('https://funpay.ru/chips/2/', '.tc-item', [
      {
        realm: '.tc-server', //@data-server num
        faction: '.tc-side', //@data-side 0/1
        status: '@data-online',
        quantity: '.tc-amount',
        owner: '.media-user-name',
        price: '.tc-price div',
      },
    ]).then(res => res);

    if (!listing || !Array.isArray(listing) || !listing.length) return

    const realms_set = new Set()

    /**
     * @type {[]}
     */
    const orders = await Promise.all(listing.map(async order => {
      const realm = await realms_db
        .findOne({ $text: { $search: order.realm } })
        .select('connected_realm_id')
        .lean();
      if (!realm || !realm.connected_realm_id) return
      if (parseFloat(order.quantity.replace(/\s/g, '')) < 15000000) {
        realms_set.add(realm.connected_realm_id)
        return {
          connected_realm_id: realm.connected_realm_id,
          faction: order.faction,
          quantity: +order.quantity.replace(/\s/g, ''),
          status: order.status ? 'Online' : 'Offline',
          owner: order.owner,
          price: +order.price.replace(/ ₽/g, ''),
          last_modified: timestamp,
        }
      }
    }))

    if (!Array.isArray(orders) || !orders.length) return

    await golds_db.insertMany(orders, {rawResult: false});
    await realms_db.updateMany({ connected_realm_id: { '$in': [...realms_set] } }, { golds: timestamp });
    console.info(`U,${orders.length}`);
  } catch (error) {
    console.log(error);
  } finally {
    console.timeEnd(`DMA-getGoldData`);
    process.exit(0)
  }
};

schedule.scheduleJob('00 * * * *', () => {
  indexGold().then(r => r)
})
