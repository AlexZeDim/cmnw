const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");

const itemValuationAdjustment = require("../../dma/valuation/turing/IVA");

router.get('/:i@:r', async function(req, res) {
    try {
        const {i, r} = req.params;
        let api = {};
        let requestPromises = [];
        isNaN(i) ? (requestPromises.push(items_db.findOne({$text:{$search: i}}).lean().exec())) : (requestPromises.push(items_db.findById(i).lean().exec()));
        isNaN(r) ? (requestPromises.push(realms_db.findOne({$text:{$search: r}}).lean().exec())) : (requestPromises.push(realms_db.findById(r).lean().exec()));
        let [item, realm] = await Promise.all(requestPromises);
        let iva = await itemValuationAdjustment(item, realm.connected_realm_id);
        Object.assign(iva, {item: item});
        Object.assign(iva, {realm: realm});
        res.status(200).json(iva);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;