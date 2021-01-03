const osint_logs_db = require('../../db/models/osint_logs_db');

/**
 *
 * @param root_id {string}
 * @param type {string}
 * @param original_value {string}
 * @param new_value {string}
 * @param action {string}
 * @param before {Date}
 * @param after {Date}
 */
const detectiveRoster = async (
  root_id,
  type,
  original_value,
  new_value,
  action,
  before,
  after
) => {
  try {
    /**
     * Find change
     * Log evidence of change // logger message
     */
    if (original_value !== new_value) return
    let message;
    switch (action) {
      case 'join':
        if (type === 'guild') {
          message = `${new_value} joins to ${root_id}`;
        }
        if (type === 'character') {
          message = `${root_id} joins to ${new_value}`;
        }
        break;
      case 'leave':
        if (type === 'guild') {
          message = `${original_value} leaves ${root_id}`;
        }
        if (type === 'character') {
          message = `${root_id} leaves ${original_value}`;
        }
        break;
      case 'promote':
        if (type === 'guild') {
          message = `In ${root_id} member ${original_value} was promoted to ${new_value}`;
        }
        if (type === 'character') {
          message = `${root_id} was promoted in ${original_value} to ${new_value}`;
        }
        break;
      case 'demote':
        if (type === 'guild') {
          message = `In ${root_id} member ${original_value} was demoted to ${new_value}`;
        }
        if (type === 'character') {
          message = `${root_id} was demoted in ${original_value} to ${new_value}`;
        }
        break;
      case 'title':
        if (type === 'guild') {
          message = `${root_id} GM title was transferred from ${original_value} to ${new_value}`;
        }
        if (type === 'character') {
          message = `${original_value} has transferred GM title to ${new_value}`;
        }
        break;
      case 'ownership':
        if (type === 'guild') {
          message = `${root_id} GM ownership was transferred from ${original_value} to ${new_value}`;
        }
        if (type === 'character') {
          message = `${original_value} has transferred GM ownership to ${new_value}`;
        }
        break;
      default:
        message = '';
    }
    await osint_logs_db.create({
      root_id: root_id,
      root_history: [root_id],
      type: type,
      original_value: original_value,
      new_value: new_value,
      message: message,
      action: action,
      before: before,
      after: after,
    });
  } catch (error) {
    console.error(`E,${detectiveRoster.name},${root_id}:${error}`)
  }
}

const detectiveGuildDiffs = async (guildOld, guildNew) => {
  try {
    const detectiveCheck = ['name', 'faction'];
    await Promise.all(detectiveCheck.map(async check => {
      let message;
      if (check in guildOld && check in guildNew) {
        if (guildOld[check] !== guildNew[check]) {
          if (check === 'name') {
            message = `${guildNew.name} changed name from ${guildOld[check]} to ${guildNew[check]}`;
            //TODO update characters from roster and delete original guild?
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

          await osint_logs_db.create({
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
        }
      }
    }))
  } catch (error) {
    console.error(`E,${detectiveGuildDiffs.name}:${error}`)
  }
}

module.exports = { detectiveRoster, detectiveGuildDiffs }
