const battleNetWrapper = require('battlenet-api-wrapper');
const crc32 = require('fast-crc32c');

//TODO fix via keys
const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getCharacter (realmSlug, characterName) {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, 'eu', 'en_GB');
        let pets_checksum, mounts_checksum;
        let petSlots = [];
        let result = {};
        const [{id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level}, {pets, unlocked_battle_pet_slots},{mounts}] = await Promise.all([
            bnw.WowProfileData.getCharacterSummary(realmSlug, characterName),
            bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName),
            bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName)
        ]);
        result._id = `${name.toLowerCase()}@${realm.slug}`;
        result.id = id;
        result.name = name;
        result.gender = gender.name;
        result.faction = faction.name;
        result.race = race.name;
        result.class = character_class.name;
        result.spec = active_spec.name;
        result.realm = realm.name;
        result.level = level;
        result.lastModified = last_login_timestamp;
        result.checksum = {};
        result.ilvl = {
            eq: average_item_level,
            avg: equipped_item_level
        };
        if (guild) {
            result.guild = guild.name;
            /*
            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, (guild.name).toLowerCase().replace(/\s/g,"-"));
            const {rank} = members.find( ({ character }) => character.name === name );
            result.guild_rank = rank;*/
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
                mount_array.push(mounts[i].mount.id)
            }
            mounts_checksum = crc32.calculate(Buffer.from(mount_array)).toString(16);
            result.checksum.mounts = mounts_checksum;
        }
        return result;
    } catch (e) {
        if (e.response.status === 404 || e.response.status === 403) {
            console.error(`${getCharacter.name},${characterName}@${realmSlug}`);
        }
        return {name: characterName, realm: realmSlug}
    }
}

module.exports = getCharacter;