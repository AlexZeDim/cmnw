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
            let characterData = await characters_db.findOne({
                "name": n.toLowerCase(),

                "realm.slug": slug
            }).lean();
            if (!characterData || moment(characterData.lastModified).isBefore(moment().subtract(30, 'days'))) {
                const getCharacter = require('../../osint/getCharacter');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `OSINT-indexCharacters`});
                characterData = await getCharacter(slug, n, {}, token, `OSINT-userInput`, true);
            }
            await res.status(200).json(characterData);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;