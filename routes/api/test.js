const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const valuations_db = require("../../db/valuations_db");

/**
 * Modules
 */

const iva = require("../../dma/valuation/eva/IVA");

router.get('/:i@:r', async function(req, res) {
    try {
        const {i, r} = req.params;
        let response = {};
        let requestPromises = [];
        isNaN(i) ? (requestPromises.push(items_db.findOne({$text:{$search: i}},{score:{$meta:"textScore"}}).sort({score:{$meta:"textScore"}}).lean().exec())) : (requestPromises.push(items_db.findById(i).lean().exec()));
        isNaN(r) ? (requestPromises.push(realms_db.findOne({$text:{$search: r}}).lean().exec())) : (requestPromises.push(realms_db.findById(r).lean().exec()));
        let [item, realm] = await Promise.all(requestPromises);
        if (item && realm) {
            Object.assign(response, {item: item})
            Object.assign(response, {realm: realm})

            let valuations = await valuations_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, last_modified: realm.auctions}).sort("-value").limit(30)
            if (!valuations.length) {
                await iva(item, realm.connected_realm_id, realm.auctions, 0, 0)
                valuations = await valuations_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, last_modified: realm.auctions}).sort("-value").limit(30)
            }

            Object.assign(response, {valuations: valuations})
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;