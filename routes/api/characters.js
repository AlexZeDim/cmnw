const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:name@:realm', async function(req, res) {
    try {
        //TODO if not @ then
        let { slug } = await realms_db.findOne({$text:{$search: req.params.realm}});
        let characterData = await characters_db.findById(`${req.params.name.toLowerCase()}@${slug}`);
        if (!characterData) {
            const getCharacter = require('../../osint/getCharacter');
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `VOLUSPA-indexCharacters`});
            characterData = await getCharacter(slug, req.params.name.toLowerCase(), token, true);
            characterData.createdBy = `VOLUSPA-userInput`;
            characterData.updatedBy = `VOLUSPA-userInput`;
            if (characterData.statusCode === 200) {
                await characters_db.create(characterData).then(ch => console.info(`C,${ch._id}`));
                characterData.createdAt = Date.now();
                characterData.updatedAt = Date.now();
            }
        }
        res.status(200).json(characterData);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;