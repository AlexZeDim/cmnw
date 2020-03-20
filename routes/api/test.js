const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * TODO we don't need case:switch(), we can do it with discord model
 */

router.get('/:query', async function(req, res) {
    try {
        let end;
        let args = '';
        if (req.params.query.match(/find/g)) {
            args = req.params.query.split(/(?<=^\S+)\s/)[1];
            const params = args.split('@');
            console.log(params);
            let {data} = await axios.get(encodeURI(`http://localhost:3030/api/characters/${params[0]}@${params[1]}`));
            end = data;
            console.log(end);
        } else {
            end = req.params;
        }
        res.status(200).json(end);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;