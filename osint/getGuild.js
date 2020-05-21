const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');
const guild_db = require("../db/guilds_db");

const characters_db = require("../db/characters_db");
const getCharacter = require('./getCharacter');
const updateCharactersGuildHistory = require('./updateCharactersGuildHistory');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getGuild (realmSlug, nameSlug, token = '', updatedBy = `DMA-${getGuild.name}`) {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let guild = new guild_db({
            _id: `${nameSlug}@${realmSlug}`,
            statusCode: 400,
            updatedBy: updatedBy,
            isWatched: false
        })

        await bnw.WowProfileData.getGuildSummary(realmSlug, nameSlug).then(({id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, lastModified, statusCode }) => {
            guild.id = id;
            guild.name = name;
            guild.name_slug = nameSlug;
            guild.faction = faction.name;
            guild.realm_slug = realmSlug;
            guild.realm = realm.name;
            guild.crest = crest;
            guild.achievement_points = achievement_points;
            guild.member_count = member_count;
            guild.lastModified = moment(lastModified).toISOString(true);
            guild.created_timestamp = moment(created_timestamp).toISOString(true);
            guild.statusCode = statusCode;
        })
        /** Check request status is OK */
        let guild_old = await guild_db.findById(`${nameSlug}@${realmSlug}`).lean();
        if (guild_old) {
            //TODO check timestamp
        } else {
            /**
             * Detective:IndexDB
             * TODO check for faction/realm/name
             *
             */
            let guild_check = await guild_db.findOne({
                id: guild.id,
                realm_slug: guild.realm_slug
            }).lean();
            if (guild_check) {
                /***
                 * If guild was renamed, then save guild_history to
                 */
                if (guild_check.name !== guild.name) {
                    guild_old = Object.assign({}, guild_check);
                }
            }
            guild.createdBy = updatedBy;
        }
        if (guild.statusCode === 200) {
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
                        let character_OSINT = await characters_db.findById(`${(character.name).toLowerCase()}@${guild.realm_slug}`);
                        /** guild_member object for array.push */
                        let guild_member = {
                            character_id: character.id,
                            character_name: character.name,
                            character_rank: rank,
                            character_date: guild.lastModified,
                        };
                        /** Check if data from guild roster not character current guild */
                        if (character_OSINT) {
                            /** Check hash existence and add it to guild_members */
                            if ("a" in character_OSINT.hash) {
                                Object.assign(guild_member, {character_hash_a: character_OSINT.hash.a})
                            }
                            if ("b" in character_OSINT.hash) {
                                Object.assign(guild_member, {character_hash_b: character_OSINT.hash.b})
                            }
                            if ("ex" in character_OSINT.hash) {
                                Object.assign(guild_member, {character_hash_ex: character_OSINT.hash.ex})
                            }
                            /** If current character guild_name != guild name from OSINT and new data upcoming update guild_data */
                            if (character_OSINT.guild !== guild.name && moment(character_OSINT.lastModified).isSameOrAfter(guild.lastModified)) {
                                character_OSINT.guild = guild.name;
                                character_OSINT.guild_rank = rank;
                                character_OSINT.save();
                            }
                            /** If character guild_name = guild name from OSINT then update guild_rank */
                            if (character_OSINT.guild === guild.name) {
                                character_OSINT.guild_rank = rank;
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
                                realm_slug: character.realm.slug,
                                guild: guild.name,
                                guild_rank: rank,
                                faction: guild.faction,
                                level: character.level,
                            }
                            if (character.hasOwnProperty('playable_class')) {
                                Object.assign(character_Object, {character_class: playable_class.get(character.playable_class.id)})
                            }
                            let character_added = await getCharacter(realmSlug, character.name.toLowerCase(), character_Object, token, updatedBy)
                            if ("a" in character_added.hash) {
                                Object.assign(guild_member, {character_hash_a: character_added.hash.a})
                            }
                            if ("b" in character_added.hash) {
                                Object.assign(guild_member, {character_hash_b: character_added.hash.b})
                            }
                            Object.assign(guild_member, {character_hash_ex: character_added.hash.ex})
                        }
                        /** Push to guild.members */
                        guild.members_latest.push(guild_member)
                    }
                }
                /** End of Members loop */
            })
            /**
             * Guild_log
             */
            if (guild.members_latest.length && guild_old.members_latest.length) {
                /**
                 * All those who leaves the guild
                 * If member is not in latest, but still in old
                 */
                let leave = guild.members_latest.filter(({ character_id: id1 }) => !guild_old.members_latest.some(({ character_id: id2 }) => id2 === id1));
                if (leave.length) {
                    console.info(`LEAVE: ${leave.length} => ${guild_old.guild_log.leave.length}`);
                    guild.guild_log.leave = [...guild_old.guild_log.leave, ...leave];
                    await updateCharactersGuildHistory(leave, guild.id, guild.name, guild.realm_slug, guild.lastModified, guild_old.lastModified, 'leaves');
                }
                /**
                 * If in old_members character_id rank was lower then in latest_members then you have been promoted
                 */
                let promote = guild_old.members_latest.filter(({ character_id: id1, character_rank: r1 }) => guild.members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 > r1));
                if (promote.length) {
                    console.info(`PROMOTED: ${promote.length} => ${guild_old.guild_log.promote.length}`);
                    guild.guild_log.promote = [...guild_old.guild_log.promote, ...promote];
                    await updateCharactersGuildHistory(promote, guild.id, guild.name, guild.realm_slug, guild.lastModified, guild_old.lastModified, 'promoted');
                }
                /**
                 * If in latest_members character_id rank was lower then in old_members then you have been demoted
                 */
                let demote = guild.members_latest.filter(({ character_id: id1, character_rank: r1 }) => guild_old.members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 > r1));
                if (demote.length) {
                    console.info(`DEMOTED: ${demote.length} => ${guild_old.guild_log.demote.length}`);
                    guild.guild_log.demote = [...guild_old.guild_log.demote, ...demote];
                    await updateCharactersGuildHistory(demote, guild.id, guild.name, guild.realm_slug, guild.lastModified, guild_old.lastModified, 'demoted');
                }
                /**
                 * If latest_members have character_id rank and old_members don't have the same id, then it's a newcomer
                 */
                let join = guild_old.members_latest.filter(({character_id: id1}) => !guild.members_latest.some(({character_id: id2}) => id2 === id1));
                if (join.length) {
                    console.info(`JOIN: ${join.length} => ${guild_old.guild_log.join.length}`);
                    guild.guild_log.join = [...guild.guild_log.join, ...join];
                    await updateCharactersGuildHistory(join, guild.id, guild.name, guild.realm_slug, guild.lastModified, guild_old.lastModified, 'joins');
                }
                /**
                 * TODO Transfer ownership
                 *
                 * let ownership_old = guild_old.members_latest.find(({character_rank}) => character_rank === 0);
                 * let ownership_new = guild.members_latest.find(({character_rank}) => character_rank === 0);
                 * if ("character_hash_a" in ownership_old && "character_hash_a" in ownership_new) {
                 *    if (ownership_old.character_hash_ex !== ownership_new.character_hash_ex && ownership_old.character_hash_a !== ownership_new.character_hash_a) {
                 *        let GM_old = await characters_db.findById(`${ownership_old.character_name.toString().toLowerCase()}@${guild.realm_slug}`);
                 *    }
                 * }
                 *
                 */
            }
        }
        /** End of request status*/
        return await guild_db.findByIdAndUpdate({
                _id: guild._id
            },
            guild.toObject(),
            {
                upsert : true,
                new: true,
                lean: true
            });
    } catch (error) {
        console.error(`E,${getGuild.name},${nameSlug}@${realmSlug},${error}`);
    }
}

getGuild('gordunni','депортация','EUUFsZ2i2A1Lrp2fMWdCO24Sk9q1Hr3cP5').then(r=>console.log(r))

module.exports = getGuild;