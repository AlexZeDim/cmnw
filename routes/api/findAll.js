const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:queryFind', async function(req, res) {
    try {
        const {queryFind} = req.params;
        let param = '';
        let findAll = {};
        if (queryFind.includes('@')) {
            param = queryFind.split('@');
            let { slug } = await realms_db.findOne({$or: [
                    { 'name': param[1].charAt(0).toUpperCase() + param[1].slice(1) },
                    { 'slug': param[1] },
                    { 'ticker': param[1] },
                    { 'name_locale': param[1].charAt(0).toUpperCase() + param[1].slice(1) },
                ]});
            let character_ = await characters_db.findById(`${param[0].toLowerCase()}@${slug}`).lean();
            if (!character_) {
                const getCharacter = require('../../osint/getCharacter');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `VOLUSPA-indexCharacters`});
                character_ = await getCharacter(slug, param[0].toLowerCase(), token, true);
                character_.createdBy = `VOLUSPA-userInput`;
                character_.updatedBy = `VOLUSPA-userInput`;
                if (character_.statusCode === 200) {
                    await characters_db.create(character_).then(ch => console.info(`C,${ch._id}`));
                    character_.createdAt = Date.now();
                    character_.updatedAt = Date.now();
                }
                //TODO what is char not found?
            }
            let {checksum} = character_;
            if (checksum["pets"] && checksum["mounts"]) {
                findAll.match = await characters_db.find({
                    $and: [
                        {$or: [
                            {"checksum.pets": checksum.pets},
                            {"checksum.mounts": checksum.mounts}
                        ]},
                        {_id: {$ne: `${param[0].toLowerCase()}@${slug}`}},
                    ]
                }).lean();
                findAll._id = character_._id;
            } else {
                //TODO char found but no checksum on primary
            }
        } else {
            findAll.match = await characters_db.find({$or: [
                {"checksum.pets": queryFind},
                {"checksum.mounts": queryFind}
            ]}).lean();
        }
        findAll._id = queryFind;
        res.status(200).json(findAll);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;