/**
 * Model importing
 */

const guild_db = require("../db/guilds_db");
const characters_db = require("../db/characters_db");

/**
 * B.net wrapper
 */

const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const moment = require('moment');
const {toSlug} = require("../db/setters");
const getCharacter = require('./getCharacter');
const updateCharacterLogsRank = require('./updateCharacterLogsRank');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request guild from Blizzard API and add it to OSINT-DB (guilds)
 * (if we found a new character from guild-members, then adding it to OSINT-DB (characters))
 * @param realmSlug
 * @param nameSlug
 * @param token
 * @param updatedBy
 * @returns {Promise<*>}
 */

async function getGuild (realmSlug, nameSlug, token = '', updatedBy = `OSINT-${getGuild.name}`) {
    try {
        realmSlug = toSlug(realmSlug);
        nameSlug = toSlug(nameSlug);
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let guild = new guild_db({
            _id: `${nameSlug}@${realmSlug}`,
            name: nameSlug,
            realm: realmSlug,
            statusCode: 100,
            createdBy: updatedBy,
            updatedBy: updatedBy,
            isWatched: false
        })
        await bnw.WowProfileData.getGuildSummary(realmSlug, nameSlug).then(({id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, lastModified, statusCode }) => {
            guild.id = id;
            guild.name = name;
            guild.faction = faction.name;
            guild.realm = realm.name;
            guild.crest = crest;
            guild.achievement_points = achievement_points;
            guild.member_count = member_count;
            guild.lastModified = moment(lastModified).toISOString(true);
            guild.created_timestamp = moment(created_timestamp).toISOString(true);
            guild.statusCode = statusCode;
        })
        let [guild_created, guild_byId] = await Promise.all([
            guild_db.findById(`${nameSlug}@${realmSlug}`),
            guild_db.findOne({
                realm: guild.realm,
                id: guild.id
            })
        ])
        /** Check request status is OK */
        if (guild.statusCode === 200) {
            /**
             * Detective:IndexDB
             */
            if (guild_created) {
                if (guild_created.faction !== guild.faction) {
                    guild.logs.push({
                        old_value: guild_created.faction,
                        new_value: guild.faction,
                        action: `faction`,
                        message: `${guild.name}@${guild.realm} changed faction from ${guild_created.faction} to ${guild.faction}`,
                        after: moment(guild_created.lastModified).toISOString(true),
                        before: moment(guild.lastModified).toISOString(true)
                    })
                }
                delete guild.createdBy;
                //TODO check timestamp
            } else {
                if (guild_byId) {
                    /***
                     * If guild was renamed, then inherit all guild properties
                     */
                    if (guild_byId.name !== guild.name) {
                        guild_created = Object.assign({}, guild_byId);
                    }
                }
                guild.createdBy = updatedBy;
            }
            /**
             * Request membership list of this guild
             */
            await bnw.WowProfileData.getGuildRoster(realmSlug, nameSlug).then(async ({members}) => {
                /** Playable Class table */
                const playable_class = new Map([
                    [1, 'Warrior'],
                    [2, 'Paladin'],
                    [3, 'Hunter'],
                    [4, 'Rogue'],
                    [5, 'Priest'],
                    [6, 'Death Knight'],
                    [7, 'Shaman'],
                    [8, 'Mage'],
                    [9, 'Warlock'],
                    [10, 'Monk'],
                    [11, 'Druid'],
                    [12, 'Demon Hunter'],
                ]);
                /** Members loop */
                for (let member of members) {
                    let {character, rank} = member
                    if (character && rank) {
                        /** Is every guild member is in OSINT-DB? */
                        let character_OSINT = await characters_db.findById(`${character.name}@${guild.realm}`);
                        /** guild_member object for array.push */
                        let guild_member = {
                            _id: `${character.name}@${guild.realm}`,
                            id: parseInt(character.id),
                            rank: parseInt(rank),
                        };
                        /** Check if data from guild roster > current character */
                        if (character_OSINT) {
                            /** If current character guild_name != guild name from OSINT and new data upcoming update guild_data */
                            if (character_OSINT.guild !== guild.name && moment(character_OSINT.lastModified).isSameOrBefore(guild.lastModified)) {
                                character_OSINT.guild = guild.name;
                                character_OSINT.save();
                            }
                            /** If current character guild_name === guild => update rank */
                            if (character_OSINT.guild === guild.name) {
                                character_OSINT.rank = guild.rank;
                                character_OSINT.save();
                            }
                        } else  {
                            /**
                             * If new name in OSINT then
                             * find class and let
                             * getCharacter F() handle it
                             */
                            let character_Object = {
                                id: character.id,
                                name: character.name,
                                realm: guild.realm,
                                guild: guild.name,
                                guild_rank: rank,
                                faction: guild.faction,
                                level: character.level
                            }
                            if (character.hasOwnProperty('playable_class')) {
                                Object.assign(character_Object, {character_class: playable_class.get(character.playable_class.id)})
                            }
                            await getCharacter(realmSlug, character.name, character_Object, token, updatedBy)
                        }
                        /** Push to guild.members */
                        guild.members.push(guild_member)
                    }
                }
                /** End of Members loop */
            })
            /**
             * Guild_log
             */
            if (guild.members.length && guild_created.members.length) {
                /**
                 * All those who leaves the guild
                 * If member is not in latest, but still in old
                 */
                let leave = guild_created.members.filter(({id: id1}) => !guild.members.some(({id: id2}) => id1 === id2));
                if (leave.length) {
                    console.info(`LEAVE: ${leave.length} => ${guild_created.guild_log.leave.length}`);
                    guild.guild_log.leave = [...guild_created.guild_log.leave, ...leave];
                    await updateCharacterLogsRank(leave, [], guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'leaves');
                }
                /**
                 * If in old_members character_id rank was lower then in latest_members then you have been promoted
                 */
                let promote = guild.members.filter(({id: id1, rank: rank1}) => guild_created.members.some(({id: id2, rank: rank2}) => id1 === id2 && rank1 < rank2))
                if (promote.length) {
                    console.info(`PROMOTED: ${promote.length} => ${guild_created.guild_log.promote.length}`);
                    guild.guild_log.promote = [...guild_created.guild_log.promote, ...promote];
                    await updateCharacterLogsRank(promote, guild_created.members, guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'promoted');
                }
                /**
                 * If in latest_members character_id rank was lower then in old_members then you have been demoted
                 */
                let demote = guild.members.filter(({id: id1, rank: rank1}) => guild_created.members.some(({id: id2, rank: rank2}) => id1 === id2 && rank1 > rank2))
                if (demote.length) {
                    console.info(`DEMOTED: ${demote.length} => ${guild_created.guild_log.demote.length}`);
                    guild.guild_log.demote = [...guild_created.guild_log.demote, ...demote];
                    await updateCharacterLogsRank(demote, guild_created.members, guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'demoted');
                }
                /**
                 * If latest_members have character_id rank and old_members don't have the same id, then it's a newcomer
                 */
                let join = guild.members.filter(({id: id1}) => !guild_created.members.some(({id: id2}) => id1 === id2))
                if (join.length) {
                    console.info(`JOIN: ${join.length} => ${guild_created.guild_log.join.length}`);
                    guild.guild_log.join = [...guild.guild_log.join, ...join];
                    await updateCharacterLogsRank(join, [], guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'joins');
                }
                /**
                 * Transfer title || ownership
                 */
                let ownership_old = guild_created.members.find(gm => gm.rank === 0);
                let ownership_new = guild.members.find( gm => gm.rank === 0);
                if (ownership_old.id !== ownership_new.id) {
                    let [GM_old, GM_new] = await Promise.all([
                        characters_db.findOne({id: ownership_old.id, realm: guild.realm}),
                        characters_db.findOne({id: ownership_new.id, realm: guild.realm}),
                    ])
                    if (GM_old && GM_new) {
                        if (GM_old.hash.a === GM_new.hash.a) {
                            /** title transfer */
                            await updateCharacterLogsRank([ownership_old, ownership_new], [], guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'transfer title');
                        } else {
                            /** transfer ownership */
                            await updateCharacterLogsRank([ownership_old, ownership_new], [], guild.id, guild.name, guild.realm, guild.lastModified, guild_created.lastModified, 'transfer ownership');
                        }
                    }
                }
            }
            /** End of request status */
            return await guild_db.findByIdAndUpdate({
                    _id: guild._id
                },
                guild.toObject(),
                {
                    upsert : true,
                    new: true,
                    lean: true
                });
        } else {
            return void 0
        }
    } catch (error) {
        console.error(`E,${getGuild.name},${nameSlug}@${realmSlug},${error}`);
    }
}

module.exports = getGuild;