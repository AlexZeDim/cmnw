const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctions/auctionsQuotes.js");
const contracts_db = require("../../db/contracts_db");

router.get('/:i@:r', async function(req, res) {
    try {
        const {i, r} = req.params;
        //TODO search as textfields, not sure about index use, if realm
        let api = {};
        let requestPromises = [];
        let asyncPromises = [];
        isNaN(i) ? (requestPromises.push(items_db.findOne({$text:{$search: i}}).lean().exec())) : (requestPromises.push(items_db.findById(Number(i)).lean().exec()));
        isNaN(r) ? (requestPromises.push(realms_db.findOne({$text:{$search: r}}).exec())) : (requestPromises.push(realms_db.findById(Number(r)).lean().exec()));
        let [item, {connected_realm_id}] = await Promise.all(requestPromises);
        let {_id, is_auctionable, is_commdty, asset_class, expansion} = item;
        if (is_auctionable && connected_realm_id) {
            asyncPromises.push(auctionsData(_id, connected_realm_id).then(d => { return {quotes: d[0] , market: d[1]} }));
            if (is_commdty) {
                asyncPromises.push(charts(_id, connected_realm_id).then(r => { return {chart: r} }));
                if (expansion === 'BFA' && asset_class === 'COMMDTY') {
                    asyncPromises.push(
                        contracts_db.find({item_id: _id, connected_realm_id: connected_realm_id, type: 'D'},{
                            "_id": 1,
                            "code": 1
                        }).sort({updatedAt: -1}).limit(5).lean().then(c => { return {contracts_d: c}} )
                    );
                }
            } else {
                //TODO chart if buyout and bid
            }
            if (asset_class !== 'COMMDTY' && asset_class) {
                
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