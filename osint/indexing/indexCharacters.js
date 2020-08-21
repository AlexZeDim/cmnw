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

const characters_db = require('../../db/characters_db');
const keys_db = require('../../db/keys_db');

/**
 * getCharacter indexing
 */

const getCharacter = require('../getCharacter');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

async function indexCharacters(
  queryFind = {},
  queryKeys = { tags: `OSINT-${indexCharacters.name}` },
  bulkSize = 5,
) {
  try {
    console.time(`OSINT-${indexCharacters.name}`);
    let { token } = await keys_db.findOne(queryKeys);
    await characters_db
      .find(queryFind)
      .sort({ updatedAt: 1 })
      .lean()
      .cursor({ batchSize: bulkSize })
      .eachAsync(
        async ({ _id }) => {
          const [characterName, realmSlug] = _id.split('@');
          await getCharacter(
            realmSlug,
            characterName,
            {},
            token,
            `OSINT-${indexCharacters.name}`,
            false,
          );
        },
        { parallel: bulkSize },
      );
    connection.close();
    console.timeEnd(`OSINT-${indexCharacters.name}`);
  } catch (err) {
    console.error(`${indexCharacters.name},${err}`);
  }
}

indexCharacters();
