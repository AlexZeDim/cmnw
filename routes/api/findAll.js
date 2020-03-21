const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:name@:realm', async function(req, res) {
    try {
        let { slug } = await realms_db.findOne({$or: [
                { 'name': req.params.realm.charAt(0).toUpperCase() + req.params.realm.slice(1) },
                { 'slug': req.params.realm },
                { 'ticker': req.params.realm },
                { 'name_locale': req.params.realm.charAt(0).toUpperCase() + req.params.realm.slice(1) },
            ]});
        let character_ = await characters_db.findById(`${req.params.name.toLowerCase()}@${slug}`).lean();
        if (!character_) {
            const getCharacter = require('../../voluspa/getCharacter');
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `VOLUSPA-indexCharacters`});
            character_ = await getCharacter(slug, req.params.name.toLowerCase(), token, true);
            character_.createdBy = `VOLUSPA-userInput`;
            character_.updatedBy = `VOLUSPA-userInput`;
            if (character_.statusCode === 200) {
                await characters_db.create(character_).then(ch => console.info(`C,${ch._id}`));
                character_.createdAt = Date.now();
                character_.updatedAt = Date.now();
            }
        }
        let {checksum} = character_;
        if (checksum["pets"] && checksum["mounts"]) {
            //TODO check value if not empty
            character_.Hash_A = await characters_db.find({
                $and: [
                    {"checksum.pets": checksum.pets},
                    {_id: {$ne: `${req.params.name.toLowerCase()}@${slug}`}},
                ]
            });
        } else {
            //TODO char found but no checksum on primary
        }
        res.status(200).json(character_);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;