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
 * @param root_id
 * @param type
 * @param original_value Old value
 * @param new_value New value
 * @param action
 * @param before New timestamp
 * @param after Old timestamp
 * @returns {{fieldName: *, status: boolean}}
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
  /**
   * Find change
   */
  if (original_value === new_value) {
    return { fieldName: action, status: true };
  } else {
    /**
     * Log evidence of change // logger message
     */
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
    let event = new osint_logs_db({
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
    event.save();
    return { fieldName: action, status: false };
  }
}

module.exports = detectiveRoster;
