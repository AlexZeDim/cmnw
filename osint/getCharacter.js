/**
 * Model importing
 */

const characters_db = require("../db/characters_db");
const realms_db = require("../db/realms_db");

/**
 * B.net wrapper
 */

const battleNetWrapper = require('battlenet-api-wrapper');

/**
 * Modules
 */

const {toSlug, fromSlug} = require("../db/setters");
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
        const character_Object = Object.assign({}, characterObject)
        realmSlug = toSlug(realmSlug);
        characterName = toSlug(characterName);
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let character = new characters_db({
            _id: `${characterName}@${realmSlug}`,
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
                    character.realm = {
                        id: realm.id,
                        name: realm.name,
                        slug: realm.slug
                    };
                    character.level = level;
                    character.lastOnline = moment(last_login_timestamp).toISOString(true);
                    character.lastModified = moment(lastModified).toISOString(true);
                    character.isActive = true;
                    character.statusCode = statusCode;
                    character.ilvl = {
                        eq: average_item_level,
                        avg: equipped_item_level
                    };
                    if (guild) {
                        character.guild.id = guild.id;
                        character.guild.name = guild.name;
                        character.guild.slug = guild.name;
                        if (guildRank === true) {
                            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, toSlug(guild.name));
                            const {rank} = members.find(({ character }) => character.id === id );
                            character.guild.rank = rank;
                        }
                    } else {
                        delete character.guild;
                    }
                }
            ).catch(e => {
                if (/\d/g.test(e.toString())) character.statusCode = parseFloat(e.toString().match(/[0-9]+/g)[0]);
            }),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName).then(({pets})=> {
                let pets_array = [];
                let active_pets = [];
                if (pets && pets.length) {
                    for (let pet of pets) {
                        if ("is_active" in pet) {
                            if ("name" in pet) {
                                active_pets.push(`__${pet.name}`)
                            }
                            active_pets.push(pet.species.name)
                            pets_array.push(pet.level)
                        }
                        if ("name" in pet) {
                            pets_array.push(`__${pet.name}`)
                        }
                        pets_array.push(pet.species.name)
                        pets_array.push(pet.level)
                    }
                    character.hash.c = crc32.calculate(Buffer.from(active_pets.toString())).toString(16);
                    character.hash.a = crc32.calculate(Buffer.from(pets_array.toString())).toString(16);
                }
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName).then(({mounts}) => {
                let mount_array = [];
                for (let mount of mounts) {
                    mount_array.push(mount.id)
                }
                character.hash.b = crc32.calculate(Buffer.from(mount_array.toString())).toString(16);
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
            }).catch(e =>(e))
        ]);
        if (!character.hasOwnProperty('id')) {
            let {id} = await bnw.WowProfileData.getCharacterStatus(realmSlug, characterName).catch(e=>(e))
            character.id = id;
            character.isActive = true;
        }
        /**
         * isCreated and createdBy
         */
        let [character_created, character_byId] = await Promise.all([
            characters_db.findById(toSlug(`${characterName}@${realmSlug}`)),
            characters_db.findOne({
                realm: realmSlug,
                id: character.id || 0
            })
        ])
        if (character_created) {
            delete character.createdBy
            //TODO check timestamp && dont return probably other things are changed
        }
        if (character_byId) {
            //TODO inactive char or error, check lastModified for that
            if (character_byId.statusCode === 200 && character.statusCode !== 200) {

            }
        }
        //TODO only for migrations
        if (character_Object.logs && character_Object.logs.length) {
            character.logs = [...character_Object.logs]
        }
        if (character.statusCode !== 200) {
            //TODO add id request
            character.name = fromSlug(characterName);
            let {id, name, slug} = await realms_db.findOne({
                $or: [
                    { slug: realmSlug },
                    { slug_locale: realmSlug }
                ]
            })
            character.realm = {
                id: id,
                name: name,
                slug: slug,
            }
            if (character_Object && Object.keys(character_Object).length) {
                /**
                 * If request about certain character isn't successful
                 * but we already have provided values, then we use it.
                 * FIXME it's bad
                 */
                Object.assign(character, character_Object)
            }
        }
        if (character_byId && character_created) {
            /**
             * Renamed character on inactive
             * make shadow_copy of character_created and delete it
             * then inherit all from character_byId to character!
             */
            if ((character.name !== character_byId.name) && (character_created.id !== character_byId.id)) {
                /*** Shadow Copy of inactive character */
                let character_shadowCopy = Object.assign({}, character_created.toObject())
                character_shadowCopy._id = `${character_shadowCopy._id}#${character_shadowCopy.id || 0}`;
                character_shadowCopy.createdBy = `OSINT-shadowCopy`;
                await characters_db.findByIdAndDelete(character_created._id)
                await characters_db.create(character_shadowCopy);
                character_created = null;
                /** Inherit character logs by ID */
                character.logs = [...character_byId.logs]
                /** Add info to logs about rename */
                character.logs.push({
                    old_value: character_byId.name,
                    new_value: character.name,
                    action: 'rename',
                    message: `${character_byId.name}@${character.realm} now known as ${character.name}`,
                    before: character.lastModified,
                    after: character_byId.lastModified
                })
                character.createdBy = updatedBy;
                /** Delete duplicate (byID) because we create new document */
                await characters_db.findByIdAndDelete(character_byId._id)
            }
        }
        if (character_byId && !character_created) {
            /**
             * Renamed character w/o on_inactive
             */
            if (character.name !== character_byId.name) {
                /** Inherit character logs by ID */
                character.logs = [...character_byId.logs]
                /** Add info to logs about rename */
                character.logs.push({
                    old_value: character_byId.name,
                    new_value: character.name,
                    action: 'rename',
                    message: `${character_byId.name}@${character.realm} now known as ${character.name}`,
                    before: character.lastModified,
                    after: character_byId.lastModified
                })
                /** Delete duplicate (byID) because we create new document */
                await characters_db.findByIdAndDelete(character_byId._id)
            }
        }
        /**
         * Detective:IndexDB
         */
        if (character_byId && character.statusCode === 200) {
            /**
             * If statusCode to API is 200 && character_byId exists,
             * but name of character_byId not equal to requested B.net character
             * then it's rename
             */
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
        /**
         * Hash.ex
         */
        if (character.id && character.character_class) {
            let hash_ex = [character.id, character.character_class]
            character.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
        }
        console.info(`U:${character.name}@${character.realm.name}#${character.id || 0}:${character.statusCode}`)
        return await characters_db.findByIdAndUpdate({
            _id: character._id
        },
        character.toObject(),
        {
            upsert: true,
            new: true,
            lean: true,
            overwrite: true
        });
    } catch (error) {
        console.error(`E,${getCharacter.name},${fromSlug(characterName)}@${fromSlug(realmSlug)},${error}`);
    }
}

module.exports = getCharacter;