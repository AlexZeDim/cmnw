const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");
const getCharacter = require('../../voluspa/getCharacter');

router.get('/:name@:realm', async function(req, res) {
    try {
        let { slug } = await realms_db.findOne({$or: [
                { 'name': req.params.realm },
                { 'slug': req.params.realm },
                { 'name_locale': req.params.realm },
                { 'ticker': req.params.realm },
            ]});
        let characterData = await characters_db.findById(`${req.params.name.toLowerCase()}@${slug}`);
        if (!characterData) {
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `VOLUSPA-indexCharacters`});
            console.log(req.params.name.toLowerCase());
            characterData = await getCharacter(slug, req.params.name.toLowerCase(), token, true)
        }
        console.log(characterData);
        /***
         * TODO checkDB
         * TODO if not res
         * TODO then send req
         * TODO return result
         * TODO name as name-realm
         */
        res.status(200).json(characterData);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;