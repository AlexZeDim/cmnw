/**
 * TODO exclude vendor, find by item_id and sorted by timestamp each?
 * TODO aggregate group
 * TODO passive
 */

const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const items_db = require("../../../db/items_db");
const valuations_db = require("../../../db/valuations_db");

/**
 * Modules
 */

const itemRealmQuery = require("../../api/middleware")
const iva = require("../../../dma/valuation/eva/iva.js");

router.get('/:itemQuery', async function(req, res) {
    try {
        let item, response = {};

        const { itemQuery } = req.params;

        isNaN(itemQuery) ? (
            item = await items_db.findOne({$text: {$search: itemQuery}}, {score: {$meta: "textScore"}}).sort({score: {$meta:"textScore"}}).lean()
        ) : (
            item = await items_db.findById(itemQuery).lean()
        );

        if (item) {
            Object.assign(response, {item: item});
            let valuations = await valuations_db.aggregate([
                {
                    $match: {
                        item_id: item._id
                    }
                },
                {
                    $group: {
                        _id: {
                            connected_realm_id: "$connected_realm_id",
                            latest_timestamp: { $max: "$last_modified" },
                        },
                    }
                },

            ]).sort("value")


            Object.assign(response, {valuations: valuations})
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error:"Not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;