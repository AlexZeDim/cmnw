const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require('../../../db/models/items_db');
const realms_db = require('../../../db/models/realms_db');

/**
 * Modules
 */

const iva = require('../../../dma/valuation/eva/iva.js');

router.get('/:itemQuery', async function (req, res) {
  try {
    const { itemQuery } = req.params;
    let item;
    isNaN(itemQuery)
      ? (item = await items_db
          .findOne(
            { $text: { $search: itemQuery } },
            { score: { $meta: 'textScore' } },
          )
          .sort({ score: { $meta: 'textScore' } })
          .lean())
      : (item = await items_db.findById(itemQuery).lean());
    if (item) {
      await realms_db
        .aggregate([
          {
            $match: { region: 'Europe' },
          },
          {
            $group: {
              _id: '$connected_realm_id',
            },
          },
        ])
        .cursor({ batchSize: 10 })
        .exec()
        .eachAsync(
          async ({ _id }) => {
            try {
              const t = await realms_db
                .findOne({ connected_realm_id: _id })
                .select('auctions valuations')
                .lean();
              /** If there are valuation records for certain realm, create it */
              if (!t.valuations) {
                await realms_db.updateMany(
                  { connected_realm_id: _id },
                  { valuations: 0 },
                );
              }
              /** Update valuations with new auctions data */
              if (t.auctions > t.valuations) {
                await iva(item, _id, t.auctions, 0);
              }
            } catch (e) {
              console.error(e);
            }
          },
          { parallel: 10 },
        );
      await res.status(200).json({ status: 'OK' });
    } else {
      await res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
