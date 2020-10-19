/**
 * Mongo Models
 */
require('../../db/connection')
const { connection } = require('mongoose');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const fs = require('fs');
const getCharacter = require('./get_character');

(async (queryKeys = { tags: `conglomerat` }) => {
  try {
    console.time(`OSINT-fromLua`);
    let { token } = await keys_db.findOne(queryKeys);
    let path = 'C:\\Games\\World of Warcraft\\_retail_\\WTF\\Account\\ALEXZEDIM\\SavedVariables\\OSINT.lua';
    let array = [];
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
        if (array.length <= 10) {
          array.push(
            getCharacter(
              { name: name, realm: { slug: slug_locale}, updatedBy: `OSINT-fromLua` },
              token,
              false,
              false
            )
          )
        } else {
          await Promise.allSettled(array)
          array.length = 0;
          array.push(
            getCharacter(
              { name: name, realm: { slug: slug_locale}, updatedBy: `OSINT-fromLua` },
              token,
              false,
              true,
            )
          )
        }
      }
    }
    await fs.unlinkSync(path)

  } catch (error) {
    console.error(error);
  } finally {
    await connection.close();
    console.timeEnd(`OSINT-fromLua`);
  }
})();
