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
const getCharacter = require('./getCharacter');

(async function indexLua (key = `conglomerat`, path = 'C:\\Games\\World of Warcraft\\_retail_\\WTF\\Account\\ALEXZEDIM\\SavedVariables\\OSINT.lua') {
  try {
    console.time(`OSINT-fromLua`);
    const { token } = await keys_db.findOne({ tags: key });
    const array = [];
    const osint = fs.readFileSync(path, 'utf8').split('["csv"] = ')[1];
    const arrayOfLines = osint.match(/[^\r\n]+/g);
    for (const csv of arrayOfLines) {
      const csv_line = csv.split(/(,\s--\s\[\d)/)[0];
      if (csv_line.startsWith('\t\t"') && csv_line.endsWith('"')) {
        const [name, slug_locale] = csv_line
          .replace(/"/g, '')
          .replace('\t\t', '')
          .split(',');
        if (array.length <= 10) {
          array.push(
            getCharacter({
              name: name,
              realm: { slug: slug_locale},
              updatedBy: `OSINT-fromLua`,
              token: token,
              guildRank: false,
              createOnlyUnique: true
            })
          )
        } else {
          await Promise.allSettled(array)
          array.length = 0;
          array.push(
            getCharacter({
              name: name,
              realm: { slug: slug_locale},
              updatedBy: `OSINT-fromLua`,
              token: token,
              createOnlyUnique: true,
              guildRank: false })
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
