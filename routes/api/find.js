const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:type/:query', async function(req, res) {
    try {
        const {type, query} = req.params;

        let result = {};

        const queryToHash = async (type, query) => {
            let key = `hash.${type}`
            if (query.includes('@')) {
                const [n, r] = query.split('@');
                const { slug } = await realms_db.findOne({$text:{$search: r}});
                let character = await characters_db.findById(`${n.toLowerCase()}@${slug}`).lean();
                if (!character) {
                    const getCharacter = require('../../osint/getCharacter');
                    const keys_db = require("../../db/keys_db");
                    const { token } = await keys_db.findOne({tags: `OSINT-indexCharacters`});
                    character = await getCharacter(slug, n.toLowerCase(), {}, token, `OSINT-userInput`,true);
                    if (!character) {
                        await res.status(404).json({error: "not found"});
                    }
                }
                let {hash} = character;
                return {[key]: hash[type]}
            } else {
                return {[key]: query}
            }
        }

        let search = {};
        switch (type) {
            case 'a':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(50).lean();
                break;
            case 'b':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(50).lean();
                break;
            case 'c':
                search =    await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(50).lean();
                break;
            case 'ex':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(50).lean();
                break;
            case 'all':
                /**
                 * Only character can match all hashes
                 */
                if (query.includes('@')) {
                    search = {
                        $and: [
                            {"hash.a": query},
                            {"hash.b": query},
                            {"hash.c": query},
                        ]
                    }
                }
                result.match = await characters_db.find({hash: search}).limit(50).lean();
                break;
            case 'any':
                /**
                 * Only hash can match any hash fields
                 */
                if (!query.includes('@')) {
                    search = {
                        $or: [
                            {"hash.a": query},
                            {"hash.b": query},
                            {"hash.c": query},
                        ]
                    }
                }
                result.match = await characters_db.find({hash: search}).limit(50).lean();
                break;
            default:
                await res.status(404).json({error: "not found"});
                break;
        }
        result._id = query;
        await res.status(200).json(result);
    } catch (e) {
        await res.status(404).json(e);
    }
});

module.exports = router;