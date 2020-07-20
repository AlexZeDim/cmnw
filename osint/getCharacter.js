/**
 * Model importing
 */

const characters_db = require("../db/characters_db");
const realms_db = require("../db/realms_db");
const osint_logs_db = require("../db/osint_logs_db");

/**
 * Modules
 */

const crc32 = require('fast-crc32c');
const battleNetWrapper = require('battlenet-api-wrapper');
const {toSlug, fromSlug} = require("../db/setters");
const indexDetective = require("./indexing/indexDetective");

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

        /**
         * Convert to Slug
         */
        realmSlug = toSlug(realmSlug);
        characterName = toSlug(characterName);

        /**
         * B.net wrapper
         */
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');

        /**
         * Check if character exists
         */
        let character = await characters_db.findById(`${characterName}@${realmSlug}`)

        /**
         * TODO optional await bnw.WowProfileData.getCharacterStatus(realmSlug, characterName).catch(e=>(e))
         */

        const [characterData, characterPets, characterMount, characterMedia] = await Promise.allSettled([
            bnw.WowProfileData.getCharacterSummary(realmSlug, characterName),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName),
            bnw.WowProfileData.getCharacterMedia(realmSlug, characterName)
        ]);

        if (character) {
            if (characterData.value) {
                let detectiveCheck = ["race", "gender", "faction"];
                for (let check of detectiveCheck) {
                    indexDetective(character._id, "character", character[check], characterData.value[check].name, check, new Date(character.lastModified), new Date(characterData.value.last_login_timestamp))
                }
            }
        } else {
            if (!character) {
                character = new characters_db({
                    _id: `${characterName}@${realmSlug}`,
                    statusCode: 100,
                    createdBy: updatedBy,
                    updatedBy: updatedBy,
                    isWatched: false
                });
            }
        }

        /**
         * Character Data
         */
        if (characterData.value) {
            character.id = characterData.value.id
            character.name = characterData.value.name;
            character.faction = characterData.value.faction.name
            character.gender = characterData.value.gender.name
            character.race = characterData.value.race.name;
            character.character_class = characterData.value.character_class.name;
            character.level = characterData.value.level;
            character.statusCode = characterData.value.statusCode;

            /**
             * Timestamp
             */
            if ("last_login_timestamp" in characterData.value) {
                character.lastModified = characterData.value.last_login_timestamp;
            }

            /**
             * Realm
             */
            character.realm = {
                id: characterData.value.realm.id,
                name: characterData.value.realm.name,
                slug: characterData.value.realm.slug
            };

            /**
             * Active spec
             */
            if ("active_spec" in characterData.value) {
                character.spec = characterData.value.active_spec.name;
            }

            /**
             * Item Level
             */
            if ("average_item_level" in characterData.value && "equipped_item_level" in characterData.value) {
                character.ilvl = {
                    eq: characterData.value.average_item_level,
                    avg: characterData.value.equipped_item_level
                };
            }

            /**
             * Active title
             * Hash T
             */
            if ("active_title" in characterData.value) {
                character.hash.t = parseInt(characterData.value.active_title.id, 16);
            }

            /**
             * Guild
             */
            if (characterData.value.guild) {
                character.guild.id = characterData.value.guild.id;
                character.guild.name = characterData.value.guild.name;
                character.guild.slug = characterData.value.guild.name;
                if (guildRank === true) {
                    const {members} = await bnw.WowProfileData.getGuildRoster(characterData.value.realm.slug, toSlug(characterData.value.name));
                    const {rank} = members.find(({ character }) => character.id === characterData.value.id );
                    character.guild.rank = rank;
                }
            } else {
                character.guild = undefined;
            }
        } else {
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
            if (characterObject && Object.keys(characterObject).length) {
                console.log(characterObject);
            }
            character.statusCode = 400;
        }

        /**
         * Character Pets
         * Hash A & Hash C
         */
        if (characterPets.value) {
            let pets_array = [];
            let active_pets = [];
            if (characterPets.value.pets && characterPets.value.pets.length) {
                let pets = characterPets.value.pets;
                for (let pet of pets) {
                    if ("is_active" in pet) {
                        if ("name" in pet) {
                            active_pets.push(`${pet.name}`)
                        }
                        active_pets.push(pet.species.name)
                        pets_array.push(pet.level)
                    }
                    if ("name" in pet) {
                        pets_array.push(`${pet.name}`)
                    }
                    pets_array.push(pet.species.name)
                    pets_array.push(pet.level)
                }
                character.hash.c = crc32.calculate(Buffer.from(active_pets.toString())).toString(16);
                character.hash.a = crc32.calculate(Buffer.from(pets_array.toString())).toString(16);
            }
        }

        /**
         * Character Mounts
         * Hash B
         */
        if (characterMount.value) {
            let mount_array = [];
            if (characterMount.value.mounts && characterMount.value.mounts.length) {
                let mounts = characterMount.value.mounts;
                for (let mount of mounts) {
                    mount_array.push(mount.id)
                }
                character.hash.b = crc32.calculate(Buffer.from(mount_array.toString())).toString(16);
            }
        }

        /**
         * Character Media
         * ID
         */
        if (characterMedia.value) {
            if (!character.id) {
                character.id = parseInt((characterMedia.value.avatar_url).toString().split('/').pop(-1).match(/([0-9]+)/g)[0]);
            }
            character.media = {
                avatar_url: characterMedia.value.avatar_url,
                bust_url: characterMedia.value.bust_url,
                render_url: characterMedia.value.render_url
            };
        }

        /**
         * Hash.ex
         */
        if (character.id && character.character_class) {
            let hash_ex = [character.id, character.character_class]
            character.hash.ex = crc32.calculate(Buffer.from(hash_ex.toString())).toString(16);
        }

        /**
         * Check ShadowCopy
         */
        if (character.isNew) {
            //TODO check for shadow copy?
            let shadowCopy, renamedCopy;

            /**
             * If we found rename and anything else
             */
            renamedCopy = await characters_db.findOne({
                "realm.slug": realmSlug,
                "id": character.id,
            })
            if (renamedCopy) {
                let renameCheck = ["name", "race", "gender", "faction"];
                for (let check of renameCheck) {
                    indexDetective(character._id, "character", character[check], renamedCopy[check], check, new Date(character.lastModified), new Date(renamedCopy.lastModified))
                }
                /** Update all osint logs */
                await osint_logs_db.updateMany({root_id: renamedCopy._id}, {root_id: character._id});
            }

            /**
             * Shadow copy
             */
            if (!renamedCopy) {
                shadowCopy = await characters_db.findOne({
                    "hash.a": character.hash.a,
                    "hash.b": character.hash.b,
                    "hash.c": character.hash.c,
                    "hash.t": character.hash.t
                })
            }
        }

        await character.save()
        console.info(`U:${character.name}@${character.realm.name}#${character.id || 0}:${character.statusCode}`)
    } catch (error) {
        console.error(`E,${getCharacter.name},${fromSlug(characterName)}@${fromSlug(realmSlug)},${error}`);
    }
}

module.exports = getCharacter;