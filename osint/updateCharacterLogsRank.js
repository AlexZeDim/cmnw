const characters_db = require("../db/characters_db");
const moment = require('moment');

async function updateCharacterLogsRank (arrayMembers=[], arrayMembersOld = [], guild_id, guild_name, guild_realm, before, after, action = '') {
    try {
        for (let member of arrayMembers) {
            let {rank, _id, id} = member;
            let character = await characters_db.findById(_id)
            /***
             * This should never trigger, but anyway it's a failsafe
             */
            if (!character) {
                character = await characters_db.findOne({realm: guild_realm, id: id})
            }
            if (character) {
                switch (action) {
                    case 'leaves':
                        if (rank !== 0) {
                            character.logs.push({
                                old_value: guild_name,
                                new_value: character.guild,
                                action: action,
                                message: `${character.name}@${character.realm} leaves ${guild_name} // Rank: ${rank}`,
                                before: moment(before).toISOString(true),
                                after: moment(after).toISOString(true),
                            })
                        }
                        break;
                    case 'promoted':
                        character.rank = rank;
                        if (rank !== 0) {
                            character.logs.push({
                                old_value: character.guild_rank,
                                new_value: rank,
                                action: action,
                                message: `${character.name}@${character.realm}#${guild_name}:${guild_id} was promoted from Rank: ${character.guild_rank} to Rank: ${rank}`,
                                before: moment(before).toISOString(true),
                                after: moment(after).toISOString(true),
                            })
                        }
                        break;
                    case 'demoted':
                        character.rank = rank;
                        if (rank !== 0) {
                            character.logs.push({
                                old_value: character.guild_rank,
                                new_value: rank,
                                action: action,
                                message: `${character.name}@${character.realm}#${guild_name}:${guild_id} was demoted from Rank: ${character.guild_rank} to Rank: ${rank}`,
                                before: moment(before).toISOString(true),
                                after: moment(after).toISOString(true),
                            })
                        }
                        break;
                    case 'joins':
                        if (rank !== 0) {
                            character.logs.push({
                                old_value: character.guild_rank,
                                new_value: guild_name,
                                action: action,
                                message: `${character.name}@${character.realm} joins ${guild_name} //  Rank: ${rank}`,
                                before: moment(before).toISOString(true),
                                after: moment(after).toISOString(true),
                            })
                        }
                        break;
                    case 'transfer title':
                        if (arrayMembers.length === 2) {
                            if (arrayMembers[0].id === member.id) {
                                character.logs.push({
                                    old_value: character._id,
                                    new_value: arrayMembers[1]._id,
                                    action: action,
                                    message: `${character.name}@${character.realm} transfer GM title of ${guild_name}:${guild_id} to ${arrayMembers[1]._id}`,
                                    before: moment(before).toISOString(true),
                                    after: moment(after).toISOString(true),
                                })
                            }
                            if (arrayMembers[1].id === member.id) {
                                character.logs.push({
                                    old_value: arrayMembers[0]._id,
                                    new_value: character._id,
                                    action: action,
                                    message: `${character.name}@${character.realm} received GM title of ${guild_name}:${guild_id} from ${arrayMembers[0]._id}`,
                                    before: moment(before).toISOString(true),
                                    after: moment(after).toISOString(true),
                                })
                            }
                        }
                        break;
                    case 'transfer ownership':
                        if (arrayMembers.length === 2) {
                            if (arrayMembers[0].id === member.id) {
                                character.logs.push({
                                    old_value: character._id,
                                    new_value: arrayMembers[1]._id,
                                    action: action,
                                    message: `${character.name}@${character.realm} transfer ownership of ${guild_name}:${guild_id} to ${arrayMembers[1]._id}`,
                                    before: moment(before).toISOString(true),
                                    after: moment(after).toISOString(true),
                                })
                            }
                            if (arrayMembers[1].id === member.id) {
                                character.logs.push({
                                    old_value: arrayMembers[0]._id,
                                    new_value: character._id,
                                    action: action,
                                    message: `${character.name}@${character.realm} received ownership of ${guild_name}:${guild_id} from ${arrayMembers[0]._id}`,
                                    before: moment(before).toISOString(true),
                                    after: moment(after).toISOString(true),
                                })
                            }
                        }
                        break;
                    default:
                        console.log(`Sorry, we are out of options.`);
                }
                character.save()
            }
        }
    } catch (error) {
        console.error(`E,${updateCharacterLogsRank.name},${error}`);
    }
}

module.exports = updateCharacterLogsRank;