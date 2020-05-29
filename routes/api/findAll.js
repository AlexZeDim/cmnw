const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:queryFind', async function(req, res) {
    try {
        const {queryFind} = req.params;
        let findAll = {};
        if (queryFind.includes('@')) {
            const [n, r] = queryFind.split('@');
            let { slug } = await realms_db.findOne({$text:{$search: r}});
            let character = await characters_db.findById(`${n.toLowerCase()}@${slug}`).lean();
            if (!character) {
                const getCharacter = require('../../osint/getCharacter');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `OSINT-indexCharacters`});
                character = await getCharacter(slug, n.toLowerCase(), token, true);
                if (!character) {
                    await res.status(404).json({error: "not found"});
                }
            }
            let {hash} = character;
            let findQuery = [];
            if (hash) {
                for (const [key, value] of Object.entries(hash)) {
                    findQuery.push({[key]: value})
                }
                findAll.match = await characters_db.find({
                    $and: [
                        {$or: findQuery},
                        {_id: {$ne: `${character._id}`}},
                    ]
                }).lean();
                findAll._id = character._id;
            }
        } else {
            findAll.match = await characters_db.find({$or: [
                    {"hash.a": queryFind},
                    {"hash.b": queryFind},
                    {"hash.c": queryFind},
                ]
            }).lean();
        }
        findAll._id = queryFind;
        await res.status(200).json(findAll);
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;