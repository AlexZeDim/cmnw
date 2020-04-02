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
            let { slug } = await realms_db.findOne({$text:{$search: param[1]}});
            let character_ = await characters_db.findById(`${param[0].toLowerCase()}@${slug}`).lean();
            if (!character_) {
                const getCharacter = require('../../osint/getCharacter');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `OSINT-indexCharacters`});
                character_ = await getCharacter(slug, param[0].toLowerCase(), token, true);
                character_.createdBy = `OSINT-userInput`;
                character_.updatedBy = `OSINT-userInput`;
                if (character_.statusCode === 200) {
                    character_ = await characters_db.create(character_).then(ch => {console.info(`C,${ch._id}`); return ch});
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