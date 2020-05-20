const characters_db = require("../db/characters_db");
const moment = require('moment');

//TODO transfer guild_history on character if character was renamed

async function updateArray_GuildRank (arrayMembers=[], guild_id, guild_name, before, after, action = '') {
    try {
        for (let i = 0; i < arrayMembers.length; i++) {
            let { character_rank, character_id } = arrayMembers[i];
            await characters_db.findOne({id: character_id}).exec(async function (err, character_) {
                if (character_) {
                    character_.guild_history.push({
                        guild_rank: character_rank,
                        guild_id: guild_id,
                        guild_name: guild_name,
                        action: action,
                        before: moment(before).toISOString(true),
                        after: moment(after).toISOString(true),
                    });
                    character_.save();
                }
            })
        }
    } catch (error) {
        console.error(`E,${updateArray_GuildRank.name},${error}`);
    }
}

module.exports = updateArray_GuildRank;