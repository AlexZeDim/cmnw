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

const keys_db = require('../../db/keys_db');
const realms_db = require('../../db/realms_db');

/**
 * Modules
 */

const fs = require('fs');
const getCharacter = require('../getCharacter');

const fromLua = async (queryKeys = { tags: `OSINT-indexCharacters` }) => {
  try {
    console.time(`OSINT-${fromLua.name}`);
    let { token } = await keys_db.findOne(queryKeys);
    let path = 'C:\\Games\\World of Warcraft\\_retail_\\WTF\\Account\\ALEXZEDIM\\Гордунни\\Инициатива\\SavedVariables\\OSINT.lua';
    let osint = fs
      .readFileSync(
        path,
        'utf8',
      )
      .split('["csv"] = ')[1];
    let arrayOfLines = osint.match(/[^\r\n]+/g);
    for (let csv of arrayOfLines) {
      let csv_line = csv.split(/(,\s--\s\[\d)/)[0];
      if (csv_line.startsWith('\t\t"') && csv_line.endsWith('"')) {
        const [name, slug_locale] = csv_line
          .replace(/"/g, '')
          .replace('\t\t', '')
          .split(',');
        const realm = await realms_db.findOne({
          $text: { $search: slug_locale },
        })
        if (realm && realm.slug) {
          await getCharacter(
            realm.slug,
            name,
            {},
            token,
            `OSINT-${fromLua.name}`,
            false,
          );
        }
      }
    }
    connection.close();
    await fs.unlinkSync(path)
    console.timeEnd(`OSINT-${fromLua.name}`);
  } catch (e) {
    console.error(e);
  }
};

fromLua();
