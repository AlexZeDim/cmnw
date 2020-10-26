/**
 * Mongo Models
 */
require('../db/connection')
const characters_db = require('../db/models/characters_db');
const personalities_db = require('../db/models/personalities_db');

async function getPersonalities() {
  try {
    console.time(`VOLUSPA-${getPersonalities.name}`);

    await characters_db
      .aggregate([
        {
          $match: {
            hash: { $exists: true },
            'hash.a': { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: {
              hash_a: '$hash.a',
              hash_c: '$hash.c',
            },
            characters: { $addToSet: '$_id' },
            personality: { $addToSet: '$personality' }
          },
        },
      ])
      .allowDiskUse(true)
      .cursor({ batchSize: 10 })
      .exec()
      .eachAsync(
        async identity => {
          let persona;
          let flag = 'E'
          /** Default clearance */
          let clearance = [{
            access: 0,
            codeword: 'WoW',
          }];
          /** Check is such persona ID exists */
          if (identity.personality.length) {
            /** Find persona by ID */
            persona = await personalities_db.findById(identity.personality[0])
            /** If personas more then one, then report it */
            if (identity.personality.length > 1) {
              console.error(`E,${identity.personality.length},${identity._id.realm},${identity._id.hash_a},${identity._id.hash_c}`)
            }
          } else {
            /** Create new persona and save it */
            persona = new personalities_db({
              codename: 'Unknown',
              clearance: clearance
            })
            if (persona.isNew) {
              flag = 'C'
            }
            await persona.save()
          }
          let characters = await characters_db.updateMany(
            { _id: { $in: identity.characters } },
            { $set: { personality : persona._id } }
          )
          console.log(`${flag},${persona._id},${characters.n},${characters.nModified}`)
        },
        { parallel: 10 },
      );
  } catch (err) {
    console.error(`${getPersonalities.name},${err}`);
  } finally {
    console.timeEnd(`VOLUSPA-${getPersonalities.name}`);
    process.exit(1)
  }
}
