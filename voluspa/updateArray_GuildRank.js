const characters_db = require("../db/characters_db");
const moment = require('moment');

async function updateArray_GuildRank (arrayMembers=[], guild_id, guild_name, action = '') {
    try {
        for (let i = 0; i < arrayMembers.length; i++) {
            let { character_rank, character_id } = arrayMembers[i];
            await characters_db.findOne({id: character_id}).exec(async function (err, character_) {
                if (character_) {
                    character_.guild_history.push({
                        rank: character_rank,
                        id: guild_id,
                        name: guild_name,
                        action: action,
                        date: moment().toISOString(true)
                    });
                    character_.save();
                }
            })
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = updateArray_GuildRank;