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
            let contracts = await contracts_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, "date.week": moment().subtract(1,'week').get('week')}).lean();
            await res.status(200).json({
                item: item,
                realm: realm,
                contracts: contracts
            });
        }
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;