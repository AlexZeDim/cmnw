const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const contracts_db = require("../../../db/contracts_db");

/**
 * Modules
 */

const moment = require('moment');
const itemRealmQuery = require('../middleware')

router.get('/:itemName@:realmSlug', async (req, res) => {
    try {
        let { itemName, realmSlug } = req.params;

        const [item, realm] = await itemRealmQuery(itemName, realmSlug)

        if (item && realm) {
            const [contracts, data] = await contracts_db.aggregate([
                {
                    $match: {
                        item_id: item._id,
                        connected_realm_id: realm.connected_realm_id,
                        "date.week": moment().get('week')
                    }
                },
                {
                    $group: {
                        _id: null,
                        price_minimum: { $min: '$price' },
                        price_average: { $avg: '$price' },
                        price_maximum: { $max: '$price' },
                        price_standard_deviation: { $stdDevPop: "$price" },
                        quantity_minimum: { $min: '$quantity' },
                        quantity_average: { $avg: '$quantity' },
                        quantity_maximum: { $max: '$quantity' },
                        contracts: { $push: '$$ROOT'}
                    }
                }
            ]).then((aggregate) => {
                let data = aggregate[0];
                let contract = data.contracts
                delete data._id
                delete data.contracts
                return [contract, data]
            })
            await res.status(200).json({
                item: item,
                realm: realm,
                snapshot: data,
                contracts: contracts
            });
        }
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;