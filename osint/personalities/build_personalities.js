/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const personalities_db = require('../../db/models/personalities_db');
const keys_db = require('../../db/models/keys_db');

const getCharacter = require('../../osint/characters/get_character');

(async function build_personalities (bulkSize = 5) {
  try {
    console.time(`OSINT-${build_personalities.name}`);

    const { token } = await keys_db.findOne({ tags: `OSINT-indexCharacters` });

    await characters_db
      .aggregate([
        {
          $match: {
            'hash': { $exists: true },
            'hash.c': { $exists: true, $ne: null },
          },
        },
        {
          $sort: {
            'hash.c': 1
          }
        },
        {
          $group: {
            _id: {
              hash_c: '$hash.c',
            },
            characters: {
              $addToSet: {
                name: '$name',
                realm: '$realm'
              }
            },
          },
        }
      ])
      .allowDiskUse(true)
      .cursor({ batchSize: bulkSize })
      .exec()
      .eachAsync(
        async unique_c => {
          for (const character_ of unique_c.characters) {
            await getCharacter(character_, token, false, false, 0)
          }
          const unique_a = await characters_db.find({ 'hash.c': unique_c._id.hash_c }).distinct('hash.a')
          for (const hash_a of unique_a) {
            const ids = await characters_db.find({ 'hash.c': unique_c._id.hash_c, 'hash.a': hash_a }, { _id: 1 })
            /**
             * This is for purpose build only
             */
            const aliases = []
            for (const character of ids) {
              aliases.push({
                type: 'character',
                value: character._id
              })
            }
            const persona = new personalities_db({
              codename: 'Unknown',
              aliases: aliases
            })
            await persona.save()
            const updated = await characters_db.updateMany(
              { 'hash.c': unique_c._id.hash_c, 'hash.a': hash_a },
              { $set: { personality : persona._id } }
            )
            console.info(`${persona._id}, c: ${unique_c._id.hash_c}, a: ${hash_a}, ${updated.n}, ${updated.nModified}`)
          }
        },
        { parallel: bulkSize },
      );
  } catch (err) {
    console.error(`OSINT-${build_personalities.name},${err}`);
  } finally {
    console.timeEnd(`OSINT-${build_personalities.name}`);
  }
})()
