const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * TODO we don't need case:switch(), we can do it with discord model
 */

router.get('/:query', async function(req, res) {
    try {
        let args = '';
        if (req.params.query.match(/find/g)) {
            args = req.params.query.split(/(?<=^\S+)\s/)[1];
            const params = args.split('@');
            console.log(params);
            res.redirect(`http://localhost:3000/character/${params[1]}/${params[0]}`);
        }
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;