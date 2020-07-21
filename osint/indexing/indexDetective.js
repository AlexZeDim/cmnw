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

/***
 * TODO if character with _id not found, but have the same id & class
 * TODO then check lastModified
 * TODO if all YES and new character is created, then inherit guild_history and character_history and delete original
 * TODO if not new created the timestamp once more
 */

const osint_logs_db = require("../../db/osint_logs_db");

function indexDetective (root_id, type, original_value, new_value, action, before, after) {
    /**
     * Find change
     */
    if (original_value === new_value) {
        return { fieldName: action, status: true }
    } else {
        /**
         * Log evidence of change // logger message
         */
        let message;
        switch (action) {
            case "race":
                message = `${root_id} changed race from ${original_value} to ${new_value}`;
                break;
            case "gender":
                message = `${root_id} swap gender from ${original_value} to ${new_value}`;
                break;
            case "faction":
                message = `${root_id} changed faction from ${original_value} to ${new_value}`;
                break;
            case "name":
                message = `${root_id} changed name from ${original_value} to ${new_value}`;
                break;
            case "realm":
                message = `${root_id} made realm transfer from ${original_value} to ${new_value}`;
                break;
            //TODO
            case "join":
                message = `${root_id} made realm transfer from ${original_value} to ${new_value}`;
                break;
            case "leave":
                message = `${root_id} made realm transfer from ${original_value} to ${new_value}`;
                break;
            case "promote":
                message = `${root_id} made realm transfer from ${original_value} to ${new_value}`;
                break;
            case "demote":
                message = `${root_id} made realm transfer from ${original_value} to ${new_value}`;
                break;
            default:
                message = "";
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
            after: after
        });
        event.save()
        return { fieldName: action, status: false }
    }
}

module.exports = indexDetective;