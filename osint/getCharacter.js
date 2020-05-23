/**
 * Model importing
 */

const characters_db = require("../db/characters_db");

/**
 * B.net wrapper
 */

const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const {toSlug} = require("../db/setters");
const crc32 = require('fast-crc32c');
const moment = require('moment');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 * Request characters from Blizzard API and add it to OSINT-DB (guilds)
 * @param realmSlug
 * @param characterName
 * @param characterObject
 * @param token
 * @param updatedBy
 * @param guildRank
 */

async function getCharacter (realmSlug, characterName, characterObject = {}, token= '', updatedBy = 'OSINT-getCharacter', guildRank = false) {
    try {
        realmSlug = toSlug(realmSlug);
        characterName = toSlug(characterName);
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let character = new characters_db({
            _id: `${characterName}@${realmSlug}`,
            name: characterName,
            realm: realmSlug,
            statusCode: 100,
            createdBy: updatedBy,
            updatedBy: updatedBy,
            isWatched: false
        });
        await Promise.all([
            bnw.WowProfileData.getCharacterSummary(realmSlug, characterName).then(async (
                { id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level, lastModified, statusCode }) => {
                    character.id = id;
                    character.name = name;
                    character.gender = gender.name;
                    character.faction = faction.name;
                    character.race = race.name;
                    character.character_class = character_class.name;
                    character.spec = active_spec.name;
                    character.realm = realm.name;
                    character.level = level;
                    character.lastOnline = moment(last_login_timestamp).toISOString(true);
                    character.lastModified = moment(lastModified).toISOString(true);
                    character.statusCode = statusCode;
                    character.ilvl = {
                        eq: average_item_level,
                        avg: equipped_item_level
                    };
                    if (guild) {
                        character.guild = guild.name;
                        if (guildRank) {
                            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, guild.name);
                            const {rank} = members.find(({ character }) => character.id === id );
                            character.guild_rank = rank;
                        }
                    } else {
                        delete character.guild;
                        delete character.guild_rank;
                    }
                }
            ).catch(e => {
                if (/\d/g.test(e.toString())) character.statusCode = parseFloat(e.toString().match(/[0-9]+/g)[0]);
            }),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName).then(({pets})=> { //TODO unlocked_battle_pet_slots
                let pets_array = [];
                let active_pets = [];
                if (pets.length) {
                    for (let pet of pets) {
                        if ("is_active" in pet) {
                            if ("name" in pet) {
                                active_pets.push(pet.name)
                            } else {
                                active_pets.push(pet.species.name)
                            }
                        }
                        if ("name" in pet) {
                            pets_array.push(pet.name)
                        } else {
                            pets_array.push(pet.species.name)
                        }
                    }
                    character.hash.c = crc32.calculate(Buffer.from(active_pets)).toString(16);
                    character.hash.a = crc32.calculate(Buffer.from(pets_array)).toString(16);
                }
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName).then(({mounts}) => {
                let mount_array = [];
                for (let mount of mounts) {
                    mount_array.push(mount.id)
                }
                character.hash.b = crc32.calculate(Buffer.from(mount_array)).toString(16);
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMedia(realmSlug, characterName).then(({avatar_url, bust_url, render_url}) => {
                if (!character.id) {
                    character.id = parseInt(avatar_url.split('/').pop(-1).match(/([0-9]+)/g)[0]);
                }
                character.media = {
                    avatar_url: avatar_url,
                    bust_url: bust_url,
                    render_url: render_url
                };
            }).catch(e =>(e)),
        ]);
        /**
         * isCreated and createdBy
         */
        //FIXME remove later
        Object.assign(character, characterObject)
        if (character.statusCode !== 200) {
            if (Object.keys(characterObject).length) {
                /**
                 * If request about certain character isn't successful
                 * but we already have provided values, then we use it.
                 */
                Object.assign(character, characterObject)
            }
        }
        let [character_created, character_byId] = await Promise.all([
            characters_db.findById(`${characterName}@${realmSlug}`),
            characters_db.findOne({
                realm: realmSlug,
                id: character.id
            })
        ])
        if (character_created) {
            if (character_created.statusCode === 200 && character.statusCode !== 200) {
                //TODO inactive char or error, check lastModified for that
            }
            delete character.createdBy
            //TODO check timestamp && dont return probably other things are changed
        }
        if (character.statusCode === 200) {
            /**
             * Detective:IndexDB
             */
            if (character_byId) {
                /**
                 * If statusCode to API is 200 && character_byId exists,
                 * but name of character_byId not equal to requested B.net character
                 * then it's rename
                 */
                if (character_byId.name !== character.name) {
                    /**
                     * Clone character.logs from characterByID to newly created character
                     */
                    character.logs = character_byId.logs
                    if (character_created) {
                        /**
                         * And it characterByID exits, but character with the same name already existed (cause inactive)
                         * then make shadow copy of already existed character and then create it
                         */
                        await characters_db.findByIdAndUpdate({
                                _id: `${characterName}@${realmSlug}-${character_created.id}}`
                            },
                            character_created.toObject(),
                            {
                                upsert : true,
                                new: true,
                                lean: true
                            });
                        /**
                         * Delete the existing (inactive) character
                         * FIXME not sure that it's a good pattern
                         */
                        await characters_db.findByIdAndDelete(`${characterName}@${realmSlug}`)
                    }
                    /**
                     * Add info to logs about rename
                     */
                    character.logs.push({
                        old_value: character_byId.name,
                        new_value: character.name,
                        action: 'rename',
                        message: `${character_byId.name}@${character.realm} now known as ${character.name}`,
                        before: character.lastModified,
                        after: character_byId.lastModified
                    })
                }
                if (character_byId.race !== character.race) {
                    character.logs.push({
                        old_value: character_byId.race,
                        new_value: character.race,
                        action: 'race',
                        message: `${character.name}@${character.realm} changed race from ${character_byId.race} to ${character.race}`,
                        before: character.lastModified,
                        after: character_byId.lastModified
                    })
                }
                if (character_byId.gender !== character.gender) {
                    character.logs.push({
                        old_value: character_byId.gender,
                        new_value: character.gender,
                        action: 'gender',
                        message: `${character.name}@${character.realm} swap gender from ${character_byId.gender} to ${character.gender}`,
                        before: character.lastModified,
                        after: character_byId.lastModified
                    })
                }
                if (character_byId.faction !== character.faction) {
                    character.logs.push({
                        old_value: character_byId.faction,
                        new_value: character.faction,
                        action: `${character.name}@${character.realm} changed faction from ${character_byId.faction} to ${character.faction}`,
                        before: character.lastModified,
                        after: character_byId.lastModified
                    })
                }
            }
        }
        /**
         * Hash.ex
         */
        if (character.id && character.character_class) {
            let hash_ex = [character.id, character.character_class]
            character.hash.ex = crc32.calculate(Buffer.from(hash_ex)).toString(16);
        }
        console.info(`U:${character.name}@${character.realm}#${character.id || 0}:${character.statusCode} `)
        return await characters_db.findByIdAndUpdate({
            _id: character._id
        },
        character.toObject(),
        {
            upsert : true,
            new: true,
            lean: true
        });
    } catch (error) {
        console.error(`E,${getCharacter.name},${characterName}@${realmSlug},${error}`);
    }
}

module.exports = getCharacter;