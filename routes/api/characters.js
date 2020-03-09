const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:name@:realm', async function(req, res) {
    try {
        let { slug } = await realms_db.findOne({$or: [
                { 'name': req.params.realm },
                { 'slug': req.params.realm },
                { 'name_locale': req.params.realm },
                { 'ticker': req.params.realm },
            ]});
        console.log(slug);
        let characterData = await characters_db.findById(`${req.params.name.toLowerCase()}@${slug}`);
        console.log(characterData);
        /***
         * TODO checkDB
         * TODO if not res
         * TODO then send req
         * TODO return result
         */
        //let data = await checkPlayer(req.params.name, req.params.realm);
        res.status(200).json(characterData);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;