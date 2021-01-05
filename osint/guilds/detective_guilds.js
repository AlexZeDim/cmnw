const osint_logs_db = require('../../db/models/osint_logs_db');

/**
 *
 * @param guildOld
 * @param guildNew
 * @returns {Promise<void>}
 */

const detectiveGuilds = async (guildOld, guildNew) => {
  try {
    const detectiveCheck = ['realm', 'name', 'faction'];
    for (let check of detectiveCheck) {
      let message;
      if (check in guildOld && check in guildNew) {
        if (check === 'realm') {
          if (guildOld[check].slug !== guildNew[check].slug) {
            message = `${guildNew.name} made realm transfer from ${guildOld[check].name} to ${guildNew[check].name}`;
            /** if realm, then update all logs */
            await osint_logs_db.updateMany(
              {
                root_id: guildOld._id,
              },
              {
                root_id: guildNew._id,
                $push: { root_history: guildNew._id },
              },
            );
            const event = new osint_logs_db({
              root_id: guildNew._id,
              root_history: [guildNew._id],
              type: 'guild',
              original_value: guildOld[check].slug,
              new_value: guildNew[check].slug,
              message: message,
              action: check,
              before: guildNew.lastModified,
              after: guildOld.lastModified,
            });
            event.save()
          }
        } else {
          if (guildOld[check] !== guildNew[check]) {
            if (check === 'name') {
              message = `${guildNew.name} changed name from ${guildOld[check]} to ${guildNew[check]}`;
              await osint_logs_db.updateMany(
                {
                  root_id: guildOld._id,
                },
                {
                  root_id: guildNew._id,
                  $push: { root_history: guildNew._id },
                },
              );
            }

            if (check === 'faction') message = `${guildNew.name} changed faction from ${guildOld[check]} to ${guildNew[check]}`;

            const event = new osint_logs_db({
              root_id: guildNew._id,
              root_history: [guildNew._id],
              type: 'guild',
              original_value: guildOld[check],
              new_value: guildNew[check],
              message: message,
              action: check,
              before: guildNew.lastModified,
              after: guildOld.lastModified,
            });
            event.save()
          }
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = detectiveGuilds
