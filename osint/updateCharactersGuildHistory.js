const characters_db = require("../db/characters_db");
const moment = require('moment');

//TODO transfer guild_history on character if character was renamed

async function updateCharactersGuildHistory (arrayMembers=[], guild_id, guild_name, guild_realm_slug, before, after, action = '') {
    try {
        for (let member of arrayMembers) {
            let {character_rank, character_name} = member;
            let character = await characters_db.findById(`${character_name.toLowerCase()}@${guild_realm_slug}`)
            if (character) {
                character.guild_history.push({
                    guild_rank: character_rank,
                    guild_id: guild_id,
                    guild_name: guild_name,
                    guild_realm: guild_realm_slug,
                    action: action,
                    before: moment(before).toISOString(true),
                    after: moment(after).toISOString(true),
                })
                character.save()
            }
        }
    } catch (error) {
        console.error(`E,${updateCharactersGuildHistory.name},${error}`);
    }
}

module.exports = updateCharactersGuildHistory;