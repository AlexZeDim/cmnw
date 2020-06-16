const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const characters_db = require("../../db/characters_db");

router.get('/:type/:query', async function(req, res) {
    try {
        const {type, query} = req.params;

        let result = {};

        const queryToHash = async (type, query) => {
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
                if (type === 'all') {
                    delete hash.ex
                    let and = [];
                    for (const [key, value] of Object.entries(hash)) {
                        and.push({[`hash.${key}`]: value})
                    }
                    return { $and: and }
                }
                if (type === 'any') {
                    delete hash.ex
                    let or = [];
                    for (const [key, value] of Object.entries(hash)) {
                        or.push({[`hash.${key}`]: value})
                    }
                    return { $or: or }
                }
                return {[`hash.${type}`]: hash[type]}
            } else {
                if (type === 'and') {
                    return {
                        $and: [
                            {"hash.a": query},
                            {"hash.b": query},
                            {"hash.c": query},
                        ]
                    }
                }
                if (type === 'any') {
                    const hash_types = ['a', 'b', 'c'];
                    let or = [];
                    for (let ht of hash_types) {
                        or.push({[`hash.${ht}`]: query})
                    }
                    return { $or: or }
                }
                return {[`hash.${type}`]: query}
            }
        }

        let search = {};
        switch (type) {
            case 'a':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(15).lean();
                break;
            case 'b':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(15).lean();
                break;
            case 'c':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(15).lean();
                break;
            case 'ex':
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(15).lean();
                break;
            case 'all':
                /**
                 * Only character can match all hashes
                 */
                search = await queryToHash(type, query);
                result.match = await characters_db.find(search).limit(15).lean();
                break;
            case 'any':
                /**
                 * Only hash can match any hash fields
                 */
                search = await queryToHash(type, query);
                result.match = await characters_db.find({hash: search}).limit(15).lean();
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