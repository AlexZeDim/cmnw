/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    retryWrites: true,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
);

connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

/**
 * Model importing
 */

const characters_db = require('../db/characters_db');
const personalities_db = require('../db/personalities_db');

async function getPersonalities() {
  try {
    console.time(`VOLUSPA-${getPersonalities.name}`);

    await characters_db
      .aggregate([
        {
          $match: {
            hash: { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              realm: '$realm.slug',
              hash_a: '$hash.a',
              hash_c: '$hash.c',
            },
            characters: { $addToSet: '$_id' },
            personality: { $addToSet: '$personality' },
            guild: {
              $addToSet: {
                $concat: ['$guild.slug', '@', '$realm.slug'],
              },
            },
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
          /** Clearance by guild */
          let clearance = identity.guild.map(g => ({
            access: 0,
            codeword: g,
          }));
          /** Default clearance */
          clearance.push({
            access: 0,
            codeword: 'WoW',
          });
          /** Check is such persona ID exists */
          if (identity.personality.length) {
            /** If personas more then one, then report it */
            if (identity.personality.length > 1) {
              console.error(`E,${identity.personality.length},${identity._id.realm},${identity._id.hash_a},${identity._id.hash_c}`)
            }
            /** Find persona by ID */
            persona = await personalities_db.findById(identity.personality[0])
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
    connection.close();
    console.timeEnd(`VOLUSPA-${getPersonalities.name}`);
  } catch (err) {
    console.error(`${getPersonalities.name},${err}`);
  }
}

getPersonalities();
