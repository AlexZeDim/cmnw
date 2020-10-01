/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const realms_db = require('../../db/realms_db');

/**
 * Modules
 */

const Xray = require('x-ray');
let x = Xray();

/***
 * Index every realm for WCL id,
 * unfortunately it can't be done with indexRealms so we should visit every page of WCL one-by-one
 * @param startId US:0,246 EU:247,517 (RU: 492) Korea: 517
 * @param endId
 * @returns {Promise<void>}
 */

(async (startId = 247, endId = 517) => {
  try {
    console.time(`OSINT-indexRealms_WCL`);
    for (let wcl_id = startId; wcl_id < endId; wcl_id++) {
      let realm_name = await x(
        `https://www.warcraftlogs.com/server/id/${wcl_id}`,
        '.server-name',
      ).then(res => {
        return res;
      });
      let realm = await realms_db.findOne({
        $or: [
          { name: realm_name },
          { name_locale: realm_name },
          { locale_slug: realm_name },
        ],
      });
      if (realm) {
        realm.wcl_id = wcl_id;
        realm.save();
        console.info(`U,${wcl_id},${realm_name}`);
      } else {
        console.info(`E,${wcl_id},${realm_name}`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`OSINT-indexRealms_WCL`);
  }
})();
