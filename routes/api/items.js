const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");

router.get('/:item@:realm', async function(req, res) {
    try {
        let i;
        if (isNaN(req.params.item)) i = 0;
        let {_id} = await items_db.findOne({$or: [
                {"name.en_GB": (req.params.item).replace(/^\w/, c => c.toUpperCase())},
                {"name.ru_RU": (req.params.item).replace(/^\w/, c => c.toUpperCase())},
                {_id: i}
            ]});
        let { connected_realm_id } = await realms_db.findOne({$or: [
            { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'slug': req.params.realm },
            { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'ticker': req.params.realm },
        ]});
        let x = await charts(_id, connected_realm_id);
        res.status(200).json(x);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;