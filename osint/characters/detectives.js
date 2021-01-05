const osint_logs_db = require('../../db/models/osint_logs_db');
const characters_db = require('../../db/models/characters_db');

/**
 *
 * @param character_u {Object} updated character, at the end of getCharacter function
 * @param character_o {Object} character before update sequence, at the beginning of the getCharacter
 * @returns {Promise<void>}
 */
const detectiveDiffs = async (character_u, character_o) => {
  if (!character_u.lastModified) character_u.lastModified = Date.now()
  if (!character_o.lastModified) character_o.lastModified = character_o.updatedAt
  try {
    const detectiveCheck = ['realm', 'name', 'race', 'gender', 'faction'];
    await Promise.all(detectiveCheck.map(async check => {
      let message = '';
      if (check in character_o && check in character_u) {
        if (check === 'realm') {
          if (character_o[check].slug !== character_u[check].slug) {
            message = `${character_u._id} made realm transfer from ${character_o[check].name} to ${character_u[check].name}`;
            /** if realm, then update all logs */
            await osint_logs_db.updateMany(
              {
                root_id: character_o._id,
              },
              {
                root_id: character_u._id,
                $push: { root_history: character_u._id },
              },
            );
            await osint_logs_db.create({
              root_id: character_u._id,
              root_history: [character_u._id],
              type: 'character',
              original_value: character_o[check].slug,
              new_value: character_u[check].slug,
              message: message,
              action: check,
              before: character_u.lastModified,
              after: character_o.lastModified,
            });
          }
        } else {
          if (character_o[check] !== character_u[check]) {
            if (check === 'name') {
              message = `${character_u._id} changed name from ${character_o[check]} to ${character_u[check]}`;
              /** if name, then update all logs */
              await osint_logs_db.updateMany(
                {
                  root_id: character_o._id,
                },
                {
                  root_id: character_u._id,
                  $push: { root_history: character_u._id },
                },
              );
            }

            if (check === 'race') message = `${character_u._id} changed race from ${character_o[check]} to ${character_u[check]}`;
            if (check === 'gender') message = `${character_u._id} swap gender from ${character_o[check]} to ${character_u[check]}`;
            if (check === 'faction') message = `${character_u._id} changed faction from ${character_o[check]} to ${character_u[check]}`;

            await osint_logs_db.create({
              root_id: character_u._id,
              root_history: [character_u._id],
              type: 'character',
              original_value: character_o[check],
              new_value: character_u[check],
              message: message,
              action: check,
              before: character_u.lastModified,
              after: character_o.lastModified,
            });
          }
        }
      }
    }));
  } catch (error) {
    console.error(`E,${detectiveDiffs.name}:${error}`)
  }
}

const detectiveShadows = async ({ _id, id, name, realm, character_class, level, ...args }) => {
   try {
     /**
      * If we found character with the duplicate id within the realm
      * consider it as a rename character, then delete old copy
      * Else, setting confidence and flag
      * and start detecting for realm transfer
      */
     const character_renamed = await characters_db.findOne({
       'realm.slug': realm.slug,
       id: id,
       character_class: character_class,
     }).lean();

     if (character_renamed) {
       const character = {
         name: name,
         realm: realm,
         character_class: character_class,
         level: level,
       }
       await detectiveDiffs(character_renamed, { ...character, ...args })
       await characters_db.deleteOne({ _id: character_renamed._id });
     }
   } catch (error) {
     console.error(`E,${detectiveShadows.name},${_id}:${error}`)
   }
}


module.exports = { detectiveDiffs, detectiveShadows }
