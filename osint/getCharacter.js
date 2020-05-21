const battleNetWrapper = require('battlenet-api-wrapper');
const characters_db = require("../db/characters_db");
const crc32 = require('fast-crc32c');
const moment = require('moment');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 *
 * @param realmSlug
 * @param characterName
 * @param characterObject
 * @param token
 * @param updatedBy
 * @param guildRank
 */

async function getCharacter (realmSlug, characterName, characterObject = {}, token= '', updatedBy = 'DMA-getCharacter', guildRank = false) {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let character = new characters_db({
            _id: `${characterName}@${realmSlug}`,
            statusCode: 400,
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
                    character.realm_slug = realm.slug;
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
                            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, (guild.name).toLowerCase().replace(/\s/g,"-"));
                            const {rank} = members.find(({ character }) => character.name === name );
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
                if (pets.length) {
                    for (let pet of pets) {
                        if ("is_active" in pet) {
                            character.hash.petSlots.push(pet);
                        }
                        if ("name" in pet) {
                            pets_array.push(pet.name)
                        } else {
                            pets_array.push(pet.species.name)
                        }
                    }
                    character.hash.a = crc32.calculate(Buffer.from(pets_array)).toString(16);
                }
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName).then( ({mounts}) => {
                let mount_array = [];
                for (let mount of mounts) {
                    mount_array.push(mount.id)
                }
                character.hash.b = crc32.calculate(Buffer.from(mount_array)).toString(16);
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMedia(realmSlug, characterName).then(({avatar_url, bust_url, render_url}) => {
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
        let isCreated = await characters_db.findById(`${characterName}@${realmSlug}`).lean();
        if (isCreated) {
            //TODO check timestamp && dont return probably other things are changed
        } else {
            character.createdBy = updatedBy;
        }
        if (character.statusCode === 200) {
            /**
             * Detective:IndexDB
             */
            let character_check = await characters_db.findOne({
                realm_slug: character.realm_slug,
                character_class: character.character_class,
                id: character.id
            }).lean();
            if (character_check) {
                //TODO make sure it's unique
                if (character_check.name !== character.name) {
                    character.history.push({
                        old_value: character_check.name,
                        new_value: character.name,
                        action: 'rename',
                        before: character.lastModified,
                        after: character_check.lastModified
                    })
                    if (!isCreated) {
                        character.character_history = character_check.character_history
                        character.guild_history = character_check.guild_history
                    }
                }
                if (character_check.race !== character.race) {
                    character.history.push({
                        old_value: character_check.race,
                        new_value: character.race,
                        action: 'race',
                        before: character.lastModified,
                        after: character_check.lastModified
                    })
                }
                if (character_check.gender !== character.gender) {
                    character.history.push({
                        old_value: character_check.gender,
                        new_value: character.gender,
                        action: 'gender',
                        before: character.lastModified,
                        after: character_check.lastModified
                    })
                }
                if (character_check.faction !== character.faction) {
                    character.history.push({
                        old_value: character_check.faction,
                        new_value: character.faction,
                        action: 'faction',
                        before: character.lastModified,
                        after: character_check.lastModified
                    })
                }
            }
        } else {
            if (Object.keys(characterObject).length) {
                //TODO status code 200, else hui sosi
                //TODO name to first big letter mongoDB setters
                /**
                 * All values from key to original char and write, if 4o3 error!
                 */
            }
        }
        /**
         * Hash.ex
         */
        if (character.id && character.character_class) {
            let hash_ex = [character.id, character.character_class]
            character.hash.ex = crc32.calculate(Buffer.from(hash_ex)).toString(16);
        }
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