const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctions/auctionsData.js");
const aggregatedByPriceData = require("../../dma/auctions/auctionsQuotes.js");
const contracts_db = require("../../db/contracts_db");

router.get('/:item@:realm', async function(req, res) {
    try {
        //TODO search as textfields, not sure about index use
        let api = {};
        let requestPromises = [];
        let asyncPromises = [];
        if (isNaN(req.params.item)) {
            requestPromises.push( items_db.findOne({$text:{$search: req.params.item}}).lean().exec());
        } else {
            requestPromises.push( items_db.findById(Number(req.params.item)).lean().exec());
        }
        //TODO if realm
        requestPromises.push(realms_db.findOne({$text:{$search: req.params.realm}}).exec());
        let [item, {connected_realm_id}] = await Promise.all(requestPromises);
        let {_id, is_auctionable, is_commdty, is_yield, expansion, derivative} = item;
        if (is_auctionable && connected_realm_id) {
            asyncPromises.push(auctionsData(_id, connected_realm_id).then(m => { return {market: m[0]} }), aggregatedByPriceData(_id, connected_realm_id).then(q => { return {quotes: q} }));
            if (is_commdty) {
                asyncPromises.push(charts(_id, connected_realm_id).then(r => { return {chart: r} }));
                if (expansion === 'BFA' && derivative === 'COMMDTY') {
                    asyncPromises.push(
                        contracts_db.find({item_id: _id, connected_realm_id: connected_realm_id, type: 'D'},{
                            "_id": 1,
                            "code": 1
                        }).sort({updatedAt: -1}).limit(5).lean().then(c => { return {contracts_d: c}} )
                    );
                }
                if (is_yield) {
                    //TODO price %

                }
            } else {
                //TODO chart if buyout and bid
            }
            for await (let promise of asyncPromises) {
                Object.assign(api, promise)
            }
        }
        Object.assign(api, {item: item});
        res.status(200).json(api);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;