const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const valuations_db = require("../../../db/valuations_db");

/**
 * Modules
 */

const itemRealmQuery = require("../../api/middleware")
const iva = require("../../../dma/valuation/eva/iva.js");

router.get('/:itemQuery@:realmQuery', async function(req, res) {
    try {
        let response = {};

        const { itemQuery, realmQuery } = req.params;

        let [item, realm] = await itemRealmQuery(itemQuery, realmQuery);

        if (item && realm) {
            let valuations = await valuations_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, last_modified: { $gte: realm.auctions }}).sort("value")
            if (!valuations.length) {
                await iva(item, realm.connected_realm_id, realm.auctions, 0)
                valuations = await valuations_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, last_modified: { $gte: realm.auctions }}).sort("value")
            }
            Object.assign(response, {valuations: valuations})
            Object.assign(response, {item: item});
            Object.assign(response, {realm: realm});
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error:"Not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;