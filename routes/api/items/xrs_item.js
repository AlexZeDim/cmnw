const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../../db/items_db");

/**
 * Modules
 */

const auctionsFeed = require("../../../dma/auctions/auctionsFeed.js");
const ClusterChartCrossRealmData = require("../../../dma/getClusterChartCrossRealmData.js");

router.get('/:itemQuery', async function(req, res) {
    try {
        const { itemQuery } = req.params;
        let item, response = {};
        isNaN(itemQuery) ? (
            item = await items_db.findOne({$text: {$search: itemQuery}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}}).lean()
        ) : (
            item = await items_db.findById(itemQuery).lean()
        );
        if (item) {
            let is_commdty = false;

            Object.assign(response, { item: item })

            if (item.asset_class && item.asset_class.includes('COMMDTY')) {
                is_commdty = true;
            } else {
                if (item.stackable && item.stackable > 1) {
                    is_commdty = true;
                }
                if (item._id === 1) {
                    is_commdty = true;
                }
            }

            if (is_commdty) {
                await ClusterChartCrossRealmData(item._id).then(chart => Object.assign(response, { chart: chart }));
            } else {
                await auctionsFeed(item._id).then(feed => Object.assign(response, { feed: feed }))
            }

            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "Not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;
