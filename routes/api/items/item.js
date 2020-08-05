const express = require('express');
const router = express.Router();

/**
 * Modules
 */
const itemRealmQuery = require("../../api/middleware")
const clusterChartData = require("../../../dma/getClusterChartData.js");
const auctionsData = require("../../../dma/auctions/auctionsData.js");


router.get('/:itemQuery@:realmQuery', async function(req, res) {
    try {
        let response = {};
        const { itemQuery, realmQuery } = req.params;

        let [item, realm] = await itemRealmQuery(itemQuery, realmQuery);

        if (item && realm) {
            Object.assign(response, {item: item})
            Object.assign(response, {realm: realm})
            await Promise.allSettled([
                clusterChartData(item._id, realm.connected_realm_id).then(chart => Object.assign(response, { chart: chart })),
                auctionsData(item._id, realm.connected_realm_id).then(quotes => Object.assign(response, { quotes: quotes })),
            ])
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "Not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;