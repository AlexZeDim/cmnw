/***
 *
 * char.aggregate by class, id, realm_slug
 * if count + 1 then (check for gender, name, race, faction)
 *
 * if statusCode 200 not longer 200, then =>
 *   then find all (hash_a + hash_b) && class =>
 *     A. (store count and if +1)
 *     B. OSINT original 200.lastModified =
 *
 * @returns {Promise<void>}
 */

const osint_logs_db = require('../../db/models/osint_logs_db');

/**
 *
 * @param characterOld
 * @param characterNew
 * @returns {Promise<void>}
 */

const detectiveCharacters = async (characterOld = {}, characterNew = {}) => {
  if (!characterNew.lastModified) characterNew.lastModified = Date.now()
  if (!characterOld.lastModified) characterOld.lastModified = characterOld.updatedAt
  try {
    const detectiveCheck = ['realm', 'name', 'race', 'gender', 'faction'];
    for (const check of detectiveCheck) {
      let message;

      if (check in characterOld && check in characterNew) {
        if (check === 'realm') {
          if (characterOld[check].slug !== characterNew[check].slug) {
            message = `${characterNew._id} made realm transfer from ${characterOld[check].name} to ${characterNew[check].name}`;
            /** if realm, then update all logs */
            await osint_logs_db.updateMany(
              {
                root_id: characterOld._id,
              },
              {
                root_id: characterNew._id,
                $push: { root_history: characterNew._id },
              },
            );
            const event = new osint_logs_db({
              root_id: characterNew._id,
              root_history: [characterNew._id],
              type: 'character',
              original_value: characterOld[check].slug,
              new_value: characterNew[check].slug,
              message: message,
              action: check,
              before: characterNew.lastModified,
              after: characterOld.lastModified,
            });
            await event.save()
          }
        } else {
          if (characterOld[check] !== characterNew[check]) {
            if (check === 'name') {
              message = `${characterNew._id} changed name from ${characterOld[check]} to ${characterNew[check]}`;
              /** if name, then update all logs */
              await osint_logs_db.updateMany(
                {
                  root_id: characterOld._id,
                },
                {
                  root_id: characterNew._id,
                  $push: { root_history: characterNew._id },
                },
              );
            }

            if (check === 'race') message = `${characterNew._id} changed race from ${characterOld[check]} to ${characterNew[check]}`;
            if (check === 'gender') message = `${characterNew._id} swap gender from ${characterOld[check]} to ${characterNew[check]}`;
            if (check === 'faction') message = `${characterNew._id} changed faction from ${characterOld[check]} to ${characterNew[check]}`;

            const event = new osint_logs_db({
              root_id: characterNew._id,
              root_history: [characterNew._id],
              type: 'character',
              original_value: characterOld[check],
              new_value: characterNew[check],
              message: message,
              action: check,
              before: characterNew.lastModified,
              after: characterOld.lastModified,
            });
            await event.save()
          }
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = detectiveCharacters;
