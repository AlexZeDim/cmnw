const guild_db = require("../../db/guilds_db");
const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const getGuild = require('../getGuild');
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
                        let { slug, realm_slug, members_prev, members_latest } = guild;
                        let { id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, members } = await getGuild(realm_slug, slug, token);
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
                        let members_ = [];
                        let guild_log = {};
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
                                _character.guild = guild_.name; //?
                                _character.guild_rank = rank; //?
                                /*_character.guild_history.push({
                                    rank: rank,
                                    id: guild_.id,
                                    name: guild_.name,
                                    action: 'joins',
                                    date: moment().format('DD/MM/YY')
                                });*/
                                _character.updatedBy = `VOLUSPA-${indexGuild.name}`;
                                _character.save();
                                members_.push({
                                    character_name: name,
                                    character_id: id,
                                    character_rank: rank,
                                    character_date: moment().format('DD/MM/YY'),
                                    character_checksum: pets
                                })
                            } else {
                                await characters_db.create({
                                    _id: `${(name).toLowerCase()}@${guild_.realm_slug}`,
                                    id: id,
                                    name: name.replace(/^\w/, c => c.toUpperCase()),
                                    /*guild_history: [{
                                        rank: rank,
                                        id: guild_.id,
                                        name: guild_.name,
                                        action: 'joins',
                                        date: moment().format('DD/MM/YY')
                                    }],*/
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
                                    character_date: moment().format('DD/MM/YY'),
                                    character_checksum: ''
                                });
                            }
                        }
                        console.log(members_latest.length, members_.length);
                        let leave = members_latest.filter(({ character_id: id1 }) => !members_.some(({ character_id: id2 }) => id2 === id1));
                        if (leave.length) {
                            console.log('do-leave')
                        }
                        let promote = members_.filter(({ character_id: id1, character_rank: r1 }) => members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 > r1));
                        if (promote.length) {
                            //console.log(promote)
                            console.log('do-promote')
                        }
                        let demote = members_.filter(({ character_id: id1, character_rank: r1 }) => members_latest.some(({ character_id: id2, character_rank: r2 }) => id2 === id1 && r2 < r1));
                        if (demote.length) {
                            //console.log(demote)
                            console.log('do-demote')
                        }
                        let join = members_.filter(({character_id: id1}) => !members_latest.some(({character_id: id2}) => id2 === id1));
                        if (join.length) {
                            console.log('do-join')
                        }
                        //guild_.members_latest = members_;
                        //console.log(guild_);
                        /*
                        for (let i = 0; i < members.length; i++) {
                            let {rank, character} = members[i];
                            if (!members_prev && !members_latest) {
                                members_.push({character_id: character.id, rank: rank})
                            }
                            if (members_latest) {
                                members_.push({character_id: character.id, rank: rank})
                            }
                        }
                        if (!members_prev && !members_latest) {
                            guild_.members_latest = members_;
                            guild_.members_prev = members_;
                        }
                        //TODO if eq then nothing else compare
                        if (members_latest) {
                            console.log(members_latest.length, members_.length)
                            members_.filter(({character_id, rank}) => {
                                if(!members_latest.includes({character_id, rank})) {
                                    console.log({character_id, rank})
                                }
                            });
                        }*/
                        //TODO check players and guild change vice-versa // guildhistory

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
                //cursor.resume();
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