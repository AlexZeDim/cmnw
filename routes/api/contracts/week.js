const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const contracts_db = require('../../../db/models/contracts_db');

/**
 * Modules
 */

const moment = require('moment');
const queryItemAndRealm = require('../handle_item_realm');

router.get('/:itemName@:realmSlug', async (req, res) => {
  try {
    let { itemName, realmSlug } = req.params;

    const [item, realm] = await queryItemAndRealm(itemName, realmSlug);

    if (item && realm) {
      const [contracts, data] = await contracts_db
        .aggregate([
          {
            $match: {
              item_id: item._id,
              connected_realm_id: realm.connected_realm_id,
              'date.week': moment().get('week'),
            },
          },
          {
            $addFields: {
              size: {
                $cond: {
                  if: { $gt: [{ $size: '$orders' }, 0] },
                  then: { $size: '$orders' },
                  else: { $size: '$sellers' },
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              price_minimum: { $min: '$price' },
              price_average: { $avg: '$price' },
              price_maximum: { $max: '$price' },
              price_standard_deviation: { $stdDevPop: '$price' },
              quantity_minimum: { $min: '$quantity' },
              quantity_average: { $avg: '$quantity' },
              quantity_maximum: { $max: '$quantity' },
              open_interest_minimum: { $min: '$open_interest' },
              open_interest_average: { $avg: '$open_interest' },
              open_interest_maximum: { $max: '$open_interest' },
              orders_minimum: { $min: '$size' },
              orders_average: { $avg: '$size' },
              orders_maximum: { $max: '$size' },
              contracts: { $push: '$$ROOT' },
            },
          },
          {
            $addFields: {
              price_average: { $round: ['$price_average', 2] },
              price_standard_deviation: {
                $round: ['$price_standard_deviation', 2],
              },
              quantity_average: {
                $round: ['$quantity_average', 0],
              },
              open_interest_minimum: {
                $round: ['$open_interest_minimum', 0],
              },
              open_interest_average: {
                $round: ['$open_interest_average', 0],
              },
              open_interest_maximum: {
                $round: ['$open_interest_maximum', 0],
              },
              orders_average: { $round: ['$orders_average', 0] },
            },
          },
        ]).allowDiskUse(true)
        .then(aggregate => {
          let data = aggregate[0];
          let contract = data.contracts;
          delete data._id;
          delete data.contracts;
          return [contract, data];
        });
      await res.status(200).json({
        item: item,
        realm: realm,
        snapshot: data,
        contracts: contracts,
      });
    }
  } catch (e) {
    await res.status(404).json(e);
  }
});

module.exports = router;
