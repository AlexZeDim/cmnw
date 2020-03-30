const battleNetWrapper = require('battlenet-api-wrapper');
const crc32 = require('fast-crc32c');
const moment = require('moment');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

/**
 *
 * @param realmSlug
 * @param characterName
 * @param token
 * @param guildRank
 */

async function getCharacter (realmSlug, characterName, token= '', guildRank = false) {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let pets_checksum, mounts_checksum;
        let petSlots = [];
        let result = {};
        result.statusCode = 400;
        result.checksum = {};
        await Promise.all([
            bnw.WowProfileData.getCharacterSummary(realmSlug, characterName).then(async (
                { id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level, lastModified, statusCode }) => {
                    result.id = id;
                    result.name = name;
                    result.gender = gender.name;
                    result.faction = faction.name;
                    result.race = race.name;
                    result.character_class = character_class.name;
                    result.spec = active_spec.name;
                    result.realm = realm.name;
                    result.realm_slug = realm.slug;
                    result.level = level;
                    result.lastOnline = moment(last_login_timestamp).toISOString(true);
                    result.lastModified = moment(lastModified).toISOString(true);
                    result.statusCode = statusCode;
                    result.ilvl = {
                        eq: average_item_level,
                        avg: equipped_item_level
                    };
                    if (guild) {
                        result.guild = guild.name;
                        if (guildRank) {
                            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, (guild.name).toLowerCase().replace(/\s/g,"-"));
                            const {rank} = members.find( ({ character }) => character.name === name );
                            result.guild_rank = rank;
                        }
                    } else {
                        result.guild = '';
                        result.guild_rank = 99;
                    }
                }
            ).catch(e => {
                if (/\d/g.test(e.toString())) result.statusCode = parseFloat(e.toString().match(/[0-9]+/g)[0]);
            }),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName).then(({pets})=> { //TODO unlocked_battle_pet_slots
                let pets_string = '';
                for (let i = 0; i < pets.length; i++) {
                    if (pets[i].hasOwnProperty('is_active')) {
                        petSlots.push(pets[i]);
                    }
                    if (typeof pets[i].name === 'undefined') {
                        pets_string += pets[i].species.name
                    } else {
                        pets_string += pets[i].name
                    }
                }
                pets_checksum = crc32.calculate(pets_string).toString(16);
                result.checksum.petSlots = petSlots;
                result.checksum.pets = pets_checksum;
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName).then( ({mounts}) => {
                let mount_array = [];
                for (let i = 0; i < mounts.length; i++) {
                    let {mount} = mounts[i];
                    mount_array.push(mount.id)
                }
                mounts_checksum = crc32.calculate(Buffer.from(mount_array)).toString(16);
                result.checksum.mounts = mounts_checksum;
            }).catch(e =>(e)),
            bnw.WowProfileData.getCharacterMedia(realmSlug, characterName).then(({avatar_url, bust_url, render_url}) => {
                result.media = {
                    avatar_url: avatar_url,
                    bust_url: bust_url,
                    render_url: render_url
                };
            }).catch(e =>(e)),
        ]);
        result._id = `${characterName}@${realmSlug}`;
        return result;
    } catch (error) {
        let statusCode = 400;
        console.error(`E,${getCharacter.name},${characterName}@${realmSlug},${error}:${statusCode}`);
        return { _id: `${characterName}@${realmSlug}`, name: characterName.replace(/^\w/, c => c.toUpperCase()), realm_slug: realmSlug, statusCode: statusCode }
    }
}

module.exports = getCharacter;