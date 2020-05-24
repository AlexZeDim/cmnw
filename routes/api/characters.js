const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

/**
 * Modules
 */

const moment = require('moment');

router.get('/:n@:r', async function(req, res) {
    try {
        let {n, r} = req.params;
        let { slug } = await realms_db.findOne({$text:{$search: r}});
        if (n && slug) {
            let characterData = await characters_db.findById(`${n}@${slug}`).lean();
            if (!characterData || moment(characterData.lastModified).isBefore(moment().subtract(3, 'days'))) {
                console.log('nok')
                const getCharacter = require('../../osint/getCharacter');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `OSINT-indexCharacters`});
                characterData = await getCharacter(slug, n, {}, token, `OSINT-userInput`, true);
            }
            res.status(200).json(characterData);
        } else {
            res.status(404).json({error: "not found"});
        }
    } catch (e) {
        res.status(500).json(e);
    }
});

module.exports = router;