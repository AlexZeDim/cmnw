const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");
const contracts_db = require("../../db/contracts_db");

/**
 * Modules
 */

const clusterGoldData = require("../../dma/getClusterGoldData.js");
const goldsData = require("../../dma/golds/goldsData.js");

router.get('/:realmSlug', async function(req, res) {
    try {
        const { realmSlug } = req.params;
        let response = {};
        let contracts = [];
        let realm = await realms_db.findOne({$text:{$search: realmSlug}}).lean()
        if (realm) {
            Object.assign(response, {realm: realm})
            await Promise.allSettled([
                clusterGoldData(realm.connected_realm_id).then(chart => Object.assign(response, {chart: chart})),
                goldsData(realm.connected_realm_id).then(quotes => Object.assign(response, {quotes: quotes})),
                contracts_db.find({item_id: 1, connected_realm_id: realm.connected_realm_id, type: 'D'},{
                    "_id": 1,
                    "code": 1,
                    "type": 1,
                    "connected_realm_id": 1
                }).sort({updatedAt: -1}).limit(3).lean().then(contracts_day => contracts = [...contracts, ...contracts_day]),
                contracts_db.find({item_id: 1, connected_realm_id: realm.connected_realm_id, type: 'W'},{
                    "_id": 1,
                    "code": 1,
                    "type": 1,
                    "connected_realm_id": 1
                }).sort({updatedAt: -1}).limit(1).lean().then(contracts_week => contracts = [...contracts, ...contracts_week]),
                contracts_db.find({item_id: 1, connected_realm_id: realm.connected_realm_id, type: 'M'},{
                    "_id": 1,
                    "code": 1,
                    "type": 1,
                    "connected_realm_id": 1
                }).sort({updatedAt: -1}).limit(1).lean().then(contracts_month => contracts = [...contracts, ...contracts_month])
            ])
            Object.assign(response, {contracts: contracts})
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;