/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const personalities_db = require('../../db/models/personalities_db');

(async function build_personalities (bulkSize = 5) {
  try {
    console.time(`OSINT-${build_personalities.name}`);

    await characters_db
      .aggregate([
        {
          $limit: 3
        },
        {
          $match: {
            statusCode: 200,
            hash_a: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$hash_a'
          },
        }
      ])
      .cursor({ batchSize: bulkSize })
      .option({
        allowDiskUse: true
      })
      .exec()
      .eachAsync(
        async group => {

          const [personalities, block] = await Promise.all([
            await characters_db.find({ hash_a: group._id }).distinct('personality'),
            await characters_db.find({ hash_a: group._id }),
          ])
          /**
           * If there are no profiles, we create it
           * If profile found, we update
           * Otherwise ????
           */
          if (!personalities.length && block.length) {
            const file = await personalities_db.create({
              aliases: block.map(alias => ({
                type: 'character',
                value: alias._id
              }))
            })
            await Promise.all(block.map(async character => await characters_db.findByIdAndUpdate(character._id, { hash_f: file._id.toString().substr(-6), personality: file._id } )));
          } else if (personalities.length === 1 && block.length) {
            const persona = await personalities_db.findById(personalities[0])
            await Promise.all(block.map(character => persona.aliases.addToSet({
              type: 'character',
              value: character._id
            })))
            persona.markModified('aliases')
            await persona.save()
            await Promise.all(block.map(async character => await characters_db.findByIdAndUpdate(character._id, { hash_f: persona._id.toString().substr(-6), personality: persona._id } )));
            console.log(persona)
          } else if (personalities.length > 1 && block.length) {
            console.warn(`E:${group._id}:${personalities.length}#${block.length}`);
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
