const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
const contracts_db = require("../../db/contracts_db");
const valuations_db = require("../../db/valuations_db");

/**
 * Modules
 */

const charts = require("../../dma/charts.js");
const auctionsData = require("../../dma/auctions/auctionsQuotes.js");


router.get('/:i@:r', async function(req, res) {
    try {
        const {i, r} = req.params;
        let api = {};
        let requestPromises = [];
        let asyncPromises = [];
        isNaN(i) ? (requestPromises.push(items_db.findOne({$text:{$search: i}},{score:{$meta:"textScore"}}).sort({score:{$meta:"textScore"}}).lean().exec())) : (requestPromises.push(items_db.findById(i).lean().exec()));
        isNaN(r) ? (requestPromises.push(realms_db.findOne({$text:{$search: r}}).lean().exec())) : (requestPromises.push(realms_db.findById(r).lean().exec()));
        let [item, {connected_realm_id}] = await Promise.all(requestPromises);
        let {_id, is_auctionable, is_commdty, expansion} = item;
        if (is_auctionable && connected_realm_id) {
            asyncPromises.push(auctionsData(_id, connected_realm_id).then(d => { return {quotes: d[0] , market: d[1]} }));
            /**
             * Chart for commodities
             */
            if (is_commdty === true) {
                asyncPromises.push(charts(_id, connected_realm_id).then(r => { return {chart: r} }));
            } else {
                //TODO chart for non commodity
            }
            /**
             * Contracts and Valuations
             */
            if (is_commdty === true && expansion === 'BFA') {
                asyncPromises.push(
                    contracts_db.find({item_id: _id, connected_realm_id: connected_realm_id, type: 'D'},{
                        "_id": 1,
                        "code": 1
                    }).sort({updatedAt: -1}).limit(5).lean().then(c => { return {contracts_d: c}} ),
                    valuations_db.findById(`${_id}@${connected_realm_id}`).lean().then(v => { return {valuation: v}} )
                );

            }
            for await (let promise of asyncPromises) {
                Object.assign(api, promise)
            }
        }
        Object.assign(api, {item: item});
        await res.status(200).json(api);
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;