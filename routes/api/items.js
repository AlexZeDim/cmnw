const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts");

router.get('/:id@:realm', async function(req, res) {
    try {
        let { connected_realm_id } = await realms_db.findOne({$or: [
                { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'slug': req.params.realm },
                { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'ticker': req.params.realm },
            ]});
        let x = await charts(req.params.id, connected_realm_id);
        res.status(200).json(x);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;