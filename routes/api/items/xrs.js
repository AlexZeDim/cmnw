const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../../db/items_db");
const realms_db = require("../../../db/realms_db");

/**
 * Modules
 *
 */

const ClusterChartCrossRealmData = require("../../../dma/getClusterChartCrossRealmData.js");


router.get('/:itemQuery', async function(req, res) {
    try {
        const { itemQuery } = req.params;
        let item;
        let response = {};
        isNaN(itemQuery) ? (
            item = await items_db.findOne({$text: {$search: itemQuery}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}}).lean()
        ) : (
            item = await items_db.findById(itemQuery).lean()
        );
        if (item) {
            Object.assign(response, {item: item})
            await ClusterChartCrossRealmData(item._id).then(chart => Object.assign(response, {chart: chart}));
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;