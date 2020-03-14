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
        let characterData = await characters_db.findById(`${req.params.name.toLowerCase()}@${slug}`);
        if (!characterData) {
            const getCharacter = require('../../voluspa/getCharacter');
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `VOLUSPA-indexCharacters`});
            characterData = await getCharacter(slug, req.params.name.toLowerCase(), token, true);
            characterData.createdBy = `VOLUSPA-userInput`;
            characterData.updatedBy = `VOLUSPA-userInput`;
            if (characterData.statusCode === 200) {
                await characters_db.create(characterData).then(ch => console.info(`C,${ch._id}`));
            }
        }
        res.status(200).json(characterData);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;