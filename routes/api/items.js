const express = require('express');
const router = express.Router();

const items_db = require("../../db/items_db");
const realms_db = require("../../db/realms_db");
//const charts = require("../../dma/charts.js");

router.get('/:id@:realm', async function(req, res) {
    try {
        let test = await items_db.findOne({_id: req.params.id});
        let { connected_realm_id } = await realms_db.findOne({$or: [
                { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'slug': req.params.realm },
                { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'ticker': req.params.realm },
            ]});
        console.log(test, connected_realm_id);
        //let x = await charts(req.params.id, req.params.realm);
        res.status(200).json(test);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;