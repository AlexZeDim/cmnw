const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctionsData.js");

router.get('/:item@:realm', async function(req, res) {
    try {
        let i;
        if (isNaN(req.params.item)) i = 0;
        let {_id, name} = await items_db.findOne({$or: [
                {"name.en_GB": /req.params.item/i},
                {"name.ru_RU": /req.params.item/i},
                {_id: i}
            ]});
        let { connected_realm_id } = await realms_db.findOne({$or: [
            { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'slug': req.params.realm },
            { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'ticker': req.params.realm },
        ]});
        const [market, chart] = await Promise.all([
            auctionsData(_id, connected_realm_id),
            charts(_id, connected_realm_id),
        ]);
        res.status(200).json({_id: _id, name: name, market: market[0], chart: chart});
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;