const characters_db = require("../db/characters_db");
const moment = require('moment');

async function indexMembers (guild = {}, guildCreated = {}) {
    try {
        let result = {
            joins: [],
            leaves: [],
            promoted: [],
            demoted: [],
            guild_masters: []
        }
        if ((guild.members && guild.members.length) && (guildCreated.members && guildCreated.members.length)) {
            for (let member of guild.members) {
                /**
                 * If member exists in OSINT-DB data
                 */
                if (guildCreated.members.some(({id}) => id === member.id)) {
                    let member_old = guildCreated.members.find(({id}) => id === member.id)
                    if (member.rank > member_old.rank) {
                        /**
                         * Not Guild Master
                         */
                        if (member_old.rank !== 0) {
                            let character = await characters_db.findOne({"realm.slug": guild.realm.slug, id: member.id})
                            if (character) {
                                let characterLogArray = [...character.logs];
                                characterLogArray.push({
                                    old_value: member_old.rank,
                                    new_value: member.rank,
                                    action: 'demoted',
                                    message: `${character.name}@${character.realm.name}#${guild.name}:${guild.id} was demoted from Rank: ${member_old.rank} to Rank: ${member.rank}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                character.logs = characterLogArray;
                                character.save();
                            }
                            /**
                             * RETURN demoted
                             */
                            result.demoted.push(member);
                        }
                    }
                    if (member.rank < member_old.rank) {
                        if (member.rank !== 0) {
                            let character = await characters_db.findOne({"realm.slug": guild.realm.slug, id: member.id})
                            if (character) {
                                let characterLogArray = [...character.logs];
                                characterLogArray.push({
                                    old_value: member_old.rank,
                                    new_value: member.rank,
                                    action: 'promoted',
                                    message: `${character.name}@${character.realm.name}#${guild.name}:${guild.id} was promoted from Rank: ${member_old.rank} to Rank: ${member.rank}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                character.logs = characterLogArray;
                                character.save();
                            }
                            /**
                             * RETURN promoted
                             */
                            result.promoted.push(member);
                        }
                    }
                } else {
                    let character = await characters_db.findOne({"realm.slug": guild.realm.slug, id: member.id})
                    if (character) {
                        let characterLogArray = [...character.logs];
                        characterLogArray.push({
                            new_value: guild.id,
                            action: 'joins',
                            message: `${character.name}@${character.realm.name} joins ${guild.name} //  Rank: ${member.rank}`,
                            after: moment(guild.lastModified).toISOString(true),
                            before: moment(guildCreated.lastModified).toISOString(true),
                        })
                        character.logs = characterLogArray;
                        character.save();
                    }
                    /**
                     * RETURN joins
                     */
                    result.joins.push(member);
                }
            }
            for (let member of guildCreated.members) {
                if (member.rank === 0) {
                    let member_new_gm = guild.members.find(({rank}) => rank === 0)
                    let [GM_old, GM_new] = await Promise.all([
                        characters_db.findOne({"realm.slug": guild.realm.slug, id: member.id}),
                        characters_db.findOne({"realm.slug": guild.realm.slug, id: member_new_gm.id}),
                    ])
                    if (GM_old.id !== GM_new.id) {
                        if ((GM_new.hash && GM_new.hash.a) && (GM_old.hash && GM_old.hash.a)) {
                            if (GM_new.hash.a === GM_old.hash.a ) {
                                let GM_oldLogArray = [...GM_old.logs];
                                GM_oldLogArray.push({
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer title',
                                    message: `${GM_old.name}@${GM_old.realm.name} transfer GM title of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                GM_old.logs = GM_oldLogArray;
                                GM_old.save()
                                let GM_newLogArray = [...GM_new.logs];
                                GM_newLogArray.push({
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer title',
                                    message: `${GM_new.name}@${GM_old.realm.name} received GM title of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                GM_new.logs = GM_newLogArray;
                                GM_new.save()
                                result.guild_masters.push(
                                    {
                                        old_value: GM_old._id,
                                        new_value: GM_new._id,
                                        action: 'transfer title',
                                        message: `${GM_old.name}@${GM_old.realm.name} transfer GM title of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                        after: moment(guild.lastModified).toISOString(true),
                                        before: moment(guildCreated.lastModified).toISOString(true),
                                    },
                                    {
                                        old_value: GM_old._id,
                                        new_value: GM_new._id,
                                        action: 'transfer title',
                                        message: `${GM_new.name}@${GM_old.realm.name} received GM title of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                        after: moment(guild.lastModified).toISOString(true),
                                        before: moment(guildCreated.lastModified).toISOString(true),
                                    }
                                )
                            } else {
                                let GM_oldLogArray = [...GM_old.logs];
                                GM_oldLogArray.push({
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer ownership',
                                    message: `${GM_old.name}@${GM_old.realm.name} transfer ownership of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                GM_old.logs = GM_oldLogArray;
                                GM_old.save()
                                let GM_newLogArray = [...GM_new.logs];
                                GM_newLogArray.push({
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer ownership',
                                    message: `${GM_new.name}@${GM_old.realm.name} received ownership of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                })
                                GM_new.logs = GM_newLogArray;
                                GM_new.save()
                                result.guild_masters.push(
                                    {
                                        old_value: GM_old._id,
                                        new_value: GM_new._id,
                                        action: 'transfer ownership',
                                        message: `${GM_old.name}@${GM_old.realm.name} transfer ownership of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                        after: moment(guild.lastModified).toISOString(true),
                                        before: moment(guildCreated.lastModified).toISOString(true),
                                    },
                                    {
                                        old_value: GM_old._id,
                                        new_value: GM_new._id,
                                        action: 'transfer ownership',
                                        message: `${GM_new.name}@${GM_old.realm.name} received ownership of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                        after: moment(guild.lastModified).toISOString(true),
                                        before: moment(guildCreated.lastModified).toISOString(true),
                                    }
                                )
                            }
                        } else {

                            let GM_oldLogArray = [...GM_old.logs];
                            GM_oldLogArray.push({
                                old_value: GM_old._id,
                                new_value: GM_new._id,
                                action: 'transfer ownership',
                                message: `${GM_old.name}@${GM_old.realm.name} transfer ownership of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                after: moment(guild.lastModified).toISOString(true),
                                before: moment(guildCreated.lastModified).toISOString(true),
                            })
                            GM_old.logs = GM_oldLogArray;
                            GM_old.save()
                            let GM_newLogArray = [...GM_new.logs];
                            GM_newLogArray.push({
                                old_value: GM_old._id,
                                new_value: GM_new._id,
                                action: 'transfer ownership',
                                message: `${GM_new.name}@${GM_old.realm.name} received ownership of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                after: moment(guild.lastModified).toISOString(true),
                                before: moment(guildCreated.lastModified).toISOString(true),
                            })
                            GM_new.logs = GM_newLogArray;
                            GM_new.save()

                            result.guild_masters.push(
                                {
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer ownership',
                                    message: `${GM_old.name}@${GM_old.realm.name} transfer ownership of ${guild.name}:${guild.id} to ${GM_new.name}@${GM_new.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                },
                                {
                                    old_value: GM_old._id,
                                    new_value: GM_new._id,
                                    action: 'transfer ownership',
                                    message: `${GM_new.name}@${GM_old.realm.name} received ownership of ${guild.name}:${guild.id} from ${GM_old.name}@${GM_old.realm.name}`,
                                    after: moment(guild.lastModified).toISOString(true),
                                    before: moment(guildCreated.lastModified).toISOString(true),
                                }
                            )
                        }
                    }
                }
                if (!guild.members.some(({id}) => id === member.id)) {
                    let character = await characters_db.findOne({"realm.slug": guild.realm.slug, id: member.id})
                    if (character) {
                        let characterLogArray = [...character.logs];
                        characterLogArray.push({
                            old_value: guild.id,
                            action: 'leaves',
                            message: `${character.name}@${character.realm} leaves ${guild.name} // Rank: ${member.rank}`,
                            after: moment(guild.lastModified).toISOString(true),
                            before: moment(guildCreated.lastModified).toISOString(true),
                        })
                        character.logs = characterLogArray;
                        character.save();
                    }
                    /**
                     * RETURN leaves
                     */
                    result.leaves.push(member);
                }
            }
        }
        return result;
    } catch (error) {
        console.error(`E,${indexMembers.name},${error}`);
    }
}

module.exports = indexMembers;