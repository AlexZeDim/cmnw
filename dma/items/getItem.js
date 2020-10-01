/**
 * Model importing
 */

const items_db = require('../../db/items_db');
const { Round2 } = require('../../db/setters');

/**
 *  Modules
 */
const BlizzAPI = require('blizzapi');

/**
 *  Request data about certain item
 * @param id
 * @param token
 * @returns {Promise<void>}
 */
async function getItem(id, token) {
  try {
    const locale = 'en_GB';

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
    let item = await items_db.findById(id);

    /** Request item data */
    const [getItem, getMedia] = await Promise.allSettled([
      api.query(`/data/wow/item/${id}`, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      }),
      api.query(`/data/wow/media/item/${id} `, {
        timeout: 10000,
        headers: { 'Battlenet-Namespace': 'static-eu' }
      })
    ]);

    /** If not, create */
    if (!item) {
      item = new items_db({
        _id: id,
      });
    }

    if (getItem.value) {
      /** Schema fields */
      const fields = [
        'quality',
        'item_class',
        'item_subclass',
        'inventory_type',
      ];
      const gold = ['purchase_price', 'sell_price'];

      /** key value */
      for (const [key] of Object.entries(getItem.value)) {
        /** Loot type */
        if (key === 'preview_item') {
          if ('binding' in getItem.value[key]) {
            item.loot_type = getItem.value[key].binding.type;
          }
        }

        if (fields.some(f => f === key)) {
          item[key] = getItem.value[key].name[locale];
        } else {
          item[key] = getItem.value[key];
        }
        if (gold.some(f => f === key)) {
          if (key === 'sell_price') {
            item.asset_class.addToSet('VSP');
          }
          item[key] = Round2(getItem.value[key] / 10000);
        }
      }

      /** Icon media */
      if (
        getMedia.value &&
        getMedia.value.assets &&
        getMedia.value.assets.length
      ) {
        item.icon = getMedia.value.assets[0].value;
      }

      await item.save();
      console.info(`U,${item._id}`);
    }
  } catch (err) {
    console.error(`${getItem.name},${id},${err}`);
  }
}

module.exports = getItem;
