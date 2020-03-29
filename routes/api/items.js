const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctionsData.js");
const aggregatedByPriceData = require("../../dma/aggregatedByPriceData.js");

router.get('/:item@:realm', async function(req, res) {
    try {
        //TODO search as textfields, not sure about index use
        let api = {};
        let item;
        let asyncPromises = [];
        if (isNaN(req.params.item)) {
            item = await items_db.findOne({"name.en_GB": req.params.item}).collation( { locale: 'en', strength: 1 } ).lean();
            if (!item) {
                item = await items_db.findOne({"name.ru_RU": req.params.item}).collation( { locale: 'ru', strength: 1 } ).lean();
            }
        } else {
            item = await items_db.findOne({_id: req.params.item}).lean();
        }

        let {_id, name, is_auctionable, is_commdty, is_yield} = item;
        let { connected_realm_id } = await realms_db.findOne({$or: [
            { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'slug': req.params.realm },
            { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
            { 'ticker': req.params.realm },
        ]});
        if (is_auctionable) {
            asyncPromises.push(auctionsData(_id, connected_realm_id).then(m => { return {market: m[0]} }), aggregatedByPriceData(_id, connected_realm_id).then(q => { return {quotes: q} }));
            if (is_commdty) {
                //TODO unit_price
                asyncPromises.push(charts(_id, connected_realm_id).then(r => { return {chart: r} }));
                if (is_yield) {
                    //TODO check derivative
                }
            } else {
                //TODO buyout and bid
            }
        }
        for await (let promise of asyncPromises) {
            Object.assign(api, promise)
        }
        Object.assign(api, {item: item});
        res.status(200).json(api);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;