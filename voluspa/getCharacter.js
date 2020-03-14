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
        const [{id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level, lastModified, statusCode}, {pets, unlocked_battle_pet_slots},{mounts}, {avatar_url, bust_url, render_url}] = await Promise.all([
            bnw.WowProfileData.getCharacterSummary(realmSlug, characterName),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName).catch(e => (e)),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName).catch(e => (e)),
            bnw.WowProfileData.getCharacterMedia(realmSlug, characterName).catch(e => (e)),
        ]);
        result._id = `${characterName}@${realmSlug}`;
        result.id = id;
        result.name = name;
        result.gender = gender.name;
        result.faction = faction.name;
        result.race = race.name;
        result.class = character_class.name;
        result.spec = active_spec.name;
        result.realm = realm.name;
        result.realm_slug = realm.slug;
        result.level = level;
        result.lastOnline = moment(last_login_timestamp).toISOString(true);
        result.checksum = {};
        result.lastModified = moment(lastModified).toISOString(true);
        result.statusCode = statusCode;
        result.ilvl = {
            eq: average_item_level,
            avg: equipped_item_level
        };
        if (avatar_url && bust_url && render_url) {
            result.media = {
                avatar_url: avatar_url,
                bust_url: bust_url,
                render_url: render_url
            };
        }
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
        if (pets) {
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
        }
        if (mounts) {
            let mount_array = [];
            for (let i = 0; i < mounts.length; i++) {
                let {mount} = mounts[i];
                mount_array.push(mount.id)
            }
            mounts_checksum = crc32.calculate(Buffer.from(mount_array)).toString(16);
            result.checksum.mounts = mounts_checksum;
        }
        console.info(`U,${getCharacter.name},${characterName}@${realmSlug}:${id}`);
        return result;
    } catch (error) {
        let statusCode = 400;
        if (/\d/g.test(error.toString())) statusCode = error.toString().match(/[0-9]+/g)[0];
        console.error(`E,${getCharacter.name},${characterName}@${realmSlug},${error}`);
        return { _id: `${characterName}@${realmSlug}`, name: characterName.replace(/^\w/, c => c.toUpperCase()), realm_slug: realmSlug, statusCode: statusCode }
    }
}

module.exports = getCharacter;