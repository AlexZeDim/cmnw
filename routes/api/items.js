const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctionsData.js");
const aggregatedByPriceData = require("../../dma/aggregatedByPriceData.js");

router.get('/:item@:realm', async function(req, res) {
    try {
        let item;
        if (isNaN(req.params.item)) {
            item = await items_db.findOne({"name.en_GB": req.params.item}).collation( { locale: 'en', strength: 1 } );
            if (!item) {
                item = await items_db.findOne({"name.ru_RU": req.params.item}).collation( { locale: 'ru', strength: 1 } );
            }
        } else {
            item = await items_db.findOne({_id: req.params.item});
        }
        let {_id, name} = item;
        let { connected_realm_id } = await realms_db.findOne({$or: [
            { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'slug': req.params.realm },
            { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'ticker': req.params.realm },
        ]});
        const [market, chart, lvl2] = await Promise.all([
            auctionsData(_id, connected_realm_id),
            charts(_id, connected_realm_id),
            aggregatedByPriceData(_id, connected_realm_id),
        ]);
        res.status(200).json({_id: _id, name: name, item: item, market: market[0], chart: chart, lvl2: lvl2});
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;