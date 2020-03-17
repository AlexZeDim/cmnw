const express = require('express');
const router = express.Router();

const chart = require("../../dma/price_level");

router.get('/:id', async function(req, res) {
    try {
        let x = await chart();
        res.status(200).json(x);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;