/**
 * Model importing
 */

const items_db = require('../../db/models/items_db');
const { Round2 } = require('../../db/setters');

/**
 *  Modules
 */
const BlizzAPI = require('blizzapi');

/**
 * Request data about certain item
 * @param _id {number}
 * @param token {string}
 * @param locale {string=}
 * @returns {Promise<void>}
 */
const getItem = async ({ _id, token, locale= 'en_GB' }) => {
  console.time(`${getItem.name},${_id}`)
  try {

    /**
     * B.net API wrapper
     */
    const api = new BlizzAPI({
      region: 'eu',
      clientId: '60a47891677f4a43bef1bffd9317240e',
      clientSecret: 'Jdw7vPMKs5JvsZ4CjgYykqFh6yd3Uigz',
      accessToken: token
    });

    /** Check is exits */
    let item = await items_db.findById(_id);

    /** Request item data */
    const [getItemSummary, getItemMedia] = await Promise.allSettled([
      api.query(`/data/wow/item/${_id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      }),
      api.query(`/data/wow/media/item/${_id} `, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      })
    ]);

    /** If not, create */
    if (!item) {
      item = new items_db({
        _id: _id,
      });
    }

    if (getItemSummary.value) {
      /** Schema fields */
      const fields = [
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ];

      const gold = ['purchase_price', 'sell_price'];

      /** key value */
      for (const [key] of Object.entries(getItemSummary.value)) {
        /** Loot type */
        if (key === 'preview_item') {
          if ('binding' in getItemSummary.value[key]) {
            item.loot_type = getItemSummary.value[key]['binding'].type;
          }
        }

        if (fields.some(f => f === key)) {
          item[key] = getItemSummary.value[key].name[locale];
        } else {
          item[key] = getItemSummary.value[key];
        }
        if (gold.some(f => f === key)) {
          if (key === 'sell_price') {
            item.asset_class.addToSet('VSP');
          }
          item[key] = Round2(getItemSummary.value[key] / 10000);
        }
      }

      /** Icon media */
      if (
        getItemMedia.value &&
        getItemMedia.value.assets &&
        getItemMedia.value.assets.length
      ) {
        item.icon = getItemMedia.value.assets[0].value;
      }

      await item.save();
      console.info(`U,${getItem.name},${item._id}`);
    }
  } catch (error) {
    console.error(`E,${getItem.name},${_id}:${error}`);
  } finally {
    console.timeEnd(`${getItem.name},${_id}`)
  }
}

module.exports = getItem;
