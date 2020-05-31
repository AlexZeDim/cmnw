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

const clusterChartData = require("../../dma/getClusterChartData.js");
const auctionsQuotes = require("../../dma/auctions/auctionsQuotes.js");
const itemValuationAdjustment = require("../../dma/valuation/turing/IVA");


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
            await Promise.allSettled([
                itemValuationAdjustment(item, realm.connected_realm_id).then(iva => Object.assign(response, {valuation: iva})),
                clusterChartData(item._id, realm.connected_realm_id).then(chart => Object.assign(response, {chart: chart})),
                auctionsQuotes(item._id, realm.connected_realm_id).then(quotes => Object.assign(response, {quotes: quotes})),
                contracts_db.find({item_id: item._id, connected_realm_id: realm.connected_realm_id, type: 'D'},{
                    "_id": 1,
                    "code": 1,
                    "connected_realm_id": 1
                }).sort({updatedAt: -1}).limit(5).lean().then(contracts => Object.assign(response, {contracts_day: contracts}))
            ])
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;