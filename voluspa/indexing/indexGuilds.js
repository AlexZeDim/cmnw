const guild_db = require("../../db/guilds_db");
const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const getGuild = require('../getGuild');
const updateArray_GuildRank = require('../updateArray_GuildRank');
const moment = require('moment');

async function indexGuild (queryFind = '', queryKeys = { tags: `Depo` }) {
    try {
        let documentBulk = [];
        let cursor = await guild_db.find(queryFind).lean().cursor({batchSize: 1});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length === 1) {
                console.time(`Bulk-${indexGuild.name}`);
                cursor.pause();
                const { token } = await keys_db.findOne(queryKeys);
                //TODO crest
                const promises = documentBulk.map(async (guild) => {
                    try {
                        let guild_ = {};
                        let { slug, realm_slug, members_latest, guild_log } = guild;
                        let { id, name, faction, achievement_points, member_count, realm, created_timestamp, members } = await getGuild(realm_slug, slug, token);
                        guild_.id = id;
                        guild_.name = name;
                        guild_.faction = faction;
                        guild_.realm_slug = realm_slug;
                        guild_.realm = realm;
                        guild_.achievement_points = achievement_points;
                        guild_.member_count = member_count;
                        guild_.updatedBy = `VOLUSPA-${indexGuild.name}`;
                        guild_.created_timestamp = created_timestamp;
                        if (!members_latest) {
                            members_latest = [];
                        }
                        if (!guild_log) {
                            guild_log = {};
                            guild_log.leave = [];
                            guild_log.join = [];
                            guild_log.demote = [];
                            guild_log.promote = [];
                        }
                        let members_ = [];
                        for (let i = 0; i < members.length; i++) {
                            let {character, rank} = members[i];
                            let {id, name} = character;
                            let _character = await characters_db.findById(`${(name).toLowerCase()}@${guild_.realm_slug}`);
                            if (_character) {
                                let {checksum} = _character;
                                let {pets} = checksum;
                                if (!pets) {
                                    pets = '';
                                }
                                _character.guild = guild_.name;
                                _character.guild_rank = rank;
                                _character.updatedBy = `VOLUSPA-${indexGuild.name}`;
                                _character.save();
                                members_.push({
                                    character_name: name,
                                    character_id: id,
                                    character_rank: rank,
                                    character_date: moment().toISOString(true),
                                    character_checksum: pets
                                })
                            } else {
                                await characters_db.create({
                                    _id: `${(name).toLowerCase()}@${guild_.realm_slug}`,
                                    id: id,
                                    name: name.replace(/^\w/, c => c.toUpperCase()),
                                    guild: guild_.name,
                                    guild_rank: rank,
                                    realm_slug: guild_.realm_slug,
                                    createdBy: `VOLUSPA-${indexGuild.name}`,
                                    updatedBy: `VOLUSPA-${indexGuild.name}`
                                });
                                members_.push({
                                    character_name: name,
                                    character_id: id,
                                    character_rank: rank,
                                    character_date: moment().toISOString(true),
                                    character_checksum: ''
                                });
                            }
                        }
                        let leave = members_latest.filter(({ character_id: id1 }) => !members_.some(({ character_id: id2 }) => id2 === id1));
                        if (leave.length) {
                            console.log(`${guild_.id}:${guild_.name}, leave:${guild_log.leave.length}, added:${leave.length}`);
                            guild_log.leave = [...guild_log.leave, ...leave];
                            await updateArray_GuildRank(leave, guild_.id, guild_.name, 'leaves');
                        }
                        let promote = members_.filter(({ character_id: id1, character_rank: r1 }) => members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 > r1));
                        if (promote.length) {
                            console.log(`${guild_.id}:${guild_.name}, promoted:${guild_log.promote.length}, added:${promote.length}`);
                            guild_log.promote = [...guild_log.promote, ...promote];
                            await updateArray_GuildRank(promote, guild_.id, guild_.name, 'promoted');
                        }
                        let demote = members_.filter(({ character_id: id1, character_rank: r1 }) => members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 < r1));
                        if (demote.length) {
                            console.log(`${guild_.id}:${guild_.name}, demoted:${guild_log.demote.length}, added:${demote.length}`);
                            guild_log.demote = [...guild_log.demote, ...demote];
                            await updateArray_GuildRank(demote, guild_.id, guild_.name, 'demoted');
                        }
                        let join = members_.filter(({character_id: id1}) => !members_latest.some(({character_id: id2}) => id2 === id1));
                        if (join.length) {
                            console.log(`${guild_.id}:${guild_.name}, join:${guild_log.join.length}, added:${join.length}`);
                            guild_log.join = [...guild_log.join, ...join];
                            await updateArray_GuildRank(join, guild_.id, guild_.name, 'joins');
                        }
                        guild_.members_prev = members_latest;
                        guild_.members_latest = members_;
                        guild_.guild_log = guild_log;
                        console.log(`${guild_.id}:${guild_.name},U,${guild_.members_latest.length}`);
                        return await guild_db.findByIdAndUpdate(
                            {
                                _id: `${slug}@${realm_slug}`
                            },
                            guild_,
                            {
                                upsert : true,
                                new: true,
                                setDefaultsOnInsert: true,
                                lean: true
                            }
                        ).exec();
                    } catch (e) {
                        console.log(e)
                    }
                });
                await Promise.all(promises);
                documentBulk = [];
                cursor.resume();
                console.timeEnd(`Bulk-${indexGuild.name}`);
            }
        });
        cursor.on('error', error => {
            console.log('B');
            console.error(error);
            cursor.close();
        });
        cursor.on('close', async () => {
            console.log('A');
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('C');
        });
    } catch (e) {
        console.log(e)
    }
}

indexGuild();