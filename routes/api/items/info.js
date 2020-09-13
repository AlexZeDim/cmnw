const express = require('express');
const router = express.Router();

/**
 * Modules
 */
const items_db = require('../../../db/items_db');
const realms_db = require('../../../db/realms_db');

router.get('/:itemQuery@:realmQuery', async function (req, res) {
  try {

    const { itemQuery, realmQuery } = req.params;

    let item, realm, response = {};

    if (itemQuery) {
      if (isNaN(itemQuery)) {
        item = items_db
          .find(
            { $text: { $search: itemQuery } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .limit(100)
          .lean()
          .then(items => Object.assign(response, { items: items }));
      } else {
        item = items_db.findById(parseInt(itemQuery)).lean().then(item => Object.assign(response, { items: [item] }));
      }
    }

    if (realmQuery) {
      if (isNaN(realmQuery)) {
        realm = realms_db
          .findOne(
            { $text: { $search: realmQuery } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean()
          .then(realm => Object.assign(response, { realm: realm }));
      } else {
        realm = realms_db.findById(parseInt(realmQuery)).lean().then(realm => Object.assign(response, { realm: realm }));
      }
    }

    await Promise.all([await item, await realm]);

    await res.status(200).json(response);
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
