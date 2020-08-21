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

async function T() {
  try {
    console.time(`DMA-${T.name}`);

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
            guild: {
              $addToSet: {
                $concat: ['$guild.slug', '@', '$realm.slug'],
              },
            },
          },
        },
      ])
      .cursor({ batchSize: 10 })
      .exec()
      .eachAsync(
        identity => {
          /** Clearance by guild */
          let clearance = identity.guild.map(g => ({
            access: 1,
            codeword: g,
          }));
          /** Default clearance */
          clearance.push({
            access: 0,
            codeword: 'WoW',
          });
          /** Character aliases */
          let aliases = identity.characters.map(a => ({
            type: 'character',
            value: a,
          }));
          let persona = new personalities_db({
                codename: 'Unknown',
                clearance: clearance,
                aliases: aliases
            })
          persona.save();
        },
        { parallel: 10 },
      );
    connection.close();
    console.timeEnd(`DMA-${T.name}`);
  } catch (err) {
    console.error(`${T.name},${err}`);
  }
}

T();
