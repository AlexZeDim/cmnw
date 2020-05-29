const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:b', async function(req, res) {
    try {
        const {b} = req.params;
        let x = characters_db.findOne({
            hash: {
                b: `${b}`
            }
        }).lean()
        await res.status(200).json(x);
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;