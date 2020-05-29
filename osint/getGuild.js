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
const indexMembers = require('./indexMembers');

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
            statusCode: 100,
            createdBy: updatedBy,
            updatedBy: updatedBy,
            isWatched: false
        })
        await bnw.WowProfileData.getGuildSummary(realmSlug, nameSlug).then(({id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, lastModified, statusCode }) => {
            guild.id = id;
            guild.name = name;
            guild.faction = faction.name;
            guild.realm = {
                id: realm.id,
                name: realm.name,
                slug: realm.slug
            };
            guild.crest = crest;
            guild.achievement_points = achievement_points;
            guild.member_count = member_count;
            guild.lastModified = moment(lastModified).toISOString(true);
            guild.created_timestamp = moment(created_timestamp).toISOString(true);
            guild.statusCode = statusCode;
        })
        let [guild_created, guild_byId] = await Promise.all([
            guild_db.findById(toSlug(`${nameSlug}@${realmSlug}`)),
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
            if (guild_byId) {
                /***
                 * If guild was renamed, then inherit all guild properties
                 * TODO and delete copy?
                 */
                if (guild_byId.name !== guild.name) {
                    guild_created = Object.assign({}, guild_byId);
                    guild.logs = [...guild_byId.logs]
                }
            }
            if (guild_created) {
                if (guild_created.faction !== guild.faction) {
                    guild.logs = [... guild_created.logs, ...[{
                        old_value: guild_created.faction,
                        new_value: guild.faction,
                        action: `faction`,
                        message: `${guild.name}@${guild.realm} changed faction from ${guild_created.faction} to ${guild.faction}`,
                        after: moment(guild_created.lastModified).toISOString(true),
                        before: moment(guild.lastModified).toISOString(true)
                    }]]
                }
                delete guild.createdBy;
                //TODO check timestamp
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
                        let character_OSINT = await characters_db.findById(toSlug(`${character.name}@${guild.realm.slug}`));
                        /** guild_member object for array.push */
                        let guild_member = {
                            _id: `${character.name}@${guild.realm.name}`,
                            id: parseInt(character.id),
                            rank: parseInt(rank),
                        };
                        /** Check if data from guild roster > current character */
                        if (character_OSINT) {
                            /** If current character.guild.id != guild.id update character */
                            if ("lastModified" in character_OSINT) {
                                if ("guild" in character_OSINT) {
                                    if (character_OSINT.guild.id !== guild.id && moment(character_OSINT.lastModified).isSameOrBefore(guild.lastModified)) {
                                        character_OSINT.guild = {
                                            id: guild.id,
                                            name: guild.name,
                                            slug: guild.name,
                                            rank: rank
                                        }
                                        character_OSINT.save();
                                    }
                                    /** If current character.guild.id === guild.id => update rank */
                                    if (character_OSINT.guild.id === guild.id) {
                                        character_OSINT.guild.rank = rank;
                                        character_OSINT.save();
                                    }
                                }
                            } else {
                                character_OSINT.guild = {
                                    id: guild.id,
                                    name: guild.name,
                                    slug: guild.name,
                                    rank: rank
                                }
                                character_OSINT.lastModified = moment(guild.lastModified).toISOString(true);
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
                                realm: {
                                    id: guild.realm.id,
                                    name: guild.realm.name,
                                    slug: guild.realm.slug
                                },
                                guild: {
                                    id: guild.id,
                                    name: guild.name,
                                    slug: guild.name,
                                    rank: rank
                                },
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
            if (guild && guild_created) {
                let {leaves, promoted, demoted, joins, guild_masters} = await indexMembers(guild, guild_created);
                guild.guild_log = {
                    join: [...guild_created.guild_log.join, ...joins],
                    leave: [...guild_created.guild_log.leave, ...leaves],
                    promote: [...guild_created.guild_log.promote, ...promoted],
                    demote: [...guild_created.guild_log.demote, ...demoted]
                }
                if (guild_masters && guild_masters.length) {
                    guild.log = [...guild_created.log, ...guild_masters];
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