const express = require('express');
const router = express.Router();

const realms_db = require('../../db/models/realms_db');
const characters_db = require('../../db/models/characters_db');

router.get('/:type/:query', async function (req, res) {
  try {
    const { type, query } = req.params;

    let result = {};

    /**
     * Function covert request query to MongoDB query
     * @param type
     * @param query
     * @returns {Object}
     */

    const queryToHash = async (type, query) => {
      try {
        /** If query has realm argument */
        query = query.toLowerCase();
        if (query.includes('@')) {
          const [n, r] = query.split('@');
          const { slug } = await realms_db.findOne({
            $text: { $search: r },
          });
          /** Find realm and character itself */
          let character = await characters_db
            .findById(`${n.toLowerCase()}@${slug}`)
            .lean();
          if (!character) {
            /** If character is not in OSINT-DB, then add it */
            const getCharacter = require('../../osint/getCharacter');
            const keys_db = require('../../db/models/keys_db');
            const { token } = await keys_db.findOne({
              tags: `OSINT-indexCharacters`,
            });
            character = await getCharacter(
              slug,
              n.toLowerCase(),
              {},
              token,
              `OSINT-userInput`,
              true,
              true
            );
            if (!character) {
              /** Return 404, if still no character found */
              await res.status(404).json({ error: 'not found' });
            }
          }
          let { hash } = character;
          /** Remove hash ex and t */
          if (type === 'all') {
            delete hash.ex;
            delete hash.t;
            let and = [];
            for (const [key, value] of Object.entries(hash)) {
              and.push({ [`hash.${key}`]: value });
            }
            return { $and: and };
          }
          if (type === 'any') {
            delete hash.ex;
            delete hash.t;
            let or = [];
            for (const [key, value] of Object.entries(hash)) {
              or.push({ [`hash.${key}`]: value });
            }
            return { $or: or };
          }
          return { [`hash.${type}`]: hash[type] };
        } else {
          if (type === 'and') {
            return {
              $and: [
                { 'hash.a': query },
                { 'hash.b': query },
                { 'hash.c': query },
              ],
            };
          }
          if (type === 'any') {
            const hash_types = ['a', 'b', 'c'];
            let or = [];
            for (let ht of hash_types) {
              or.push({ [`hash.${ht}`]: query });
            }
            return { $or: or };
          }
          return { [`hash.${type}`]: query };
        }
      } catch (e) {
        console.error(e)
      }
    };

    let search = {};
    switch (type) {
      case 'a':
        search = await queryToHash(type, query);
        result.match = await characters_db.find(search).limit(100).lean();
        break;
      case 'b':
        search = await queryToHash(type, query);
        result.match = await characters_db.find(search).limit(100).lean();
        break;
      case 'c':
        search = await queryToHash(type, query);
        result.match = await characters_db.find(search).limit(100).lean();
        break;
      case 'ex':
        search = await queryToHash(type, query);
        result.match = await characters_db.find(search).limit(100).lean();
        break;
      case 'all':
        /**
         * Only character can match all hashes
         */
        search = await queryToHash(type, query);
        result.match = await characters_db.find(search).limit(100).lean();
        break;
      case 'any':
        /**
         * Only hash can match any hash fields
         */
        search = await queryToHash(type, query);
        result.match = await characters_db
          .find({ hash: search })
          .limit(100)
          .lean();
        break;
    }
    result._id = query;
    await res.status(200).json(result);
  } catch (e) {
    await res.status(404).json(e);
  }
});

module.exports = router;
