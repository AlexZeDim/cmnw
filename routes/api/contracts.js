const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const contracts_db = require("../../db/contracts_db");

router.get('/:code@:realm', async function(req, res) {
    try {
        let { slug } = await realms_db.findOne({$or: [
                { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'slug': req.params.realm },
                { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'ticker': req.params.realm },
            ]});
        let contract = await contracts_db.findOne({ _id: `${req.params.code}@${slug.toUpperCase()}` }).lean();
        res.status(200).json(contract);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;