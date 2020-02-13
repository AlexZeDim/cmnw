const battleNetWrapper = require('battlenet-api-wrapper');
const crypto = require('crypto');

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
        //TODO rxJS or axios?
        const {id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level} = await bnw.WowProfileData.getCharacterSummary(realmSlug, characterName);
        const {pets} = await bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName);
        const {mounts} = await bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName);
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
        if (guild) {
            result.guild = guild.name;
            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm.slug, (guild.name).toLowerCase());
            const {rank} = members.find( ({ character }) => character.name === name );
            result.guild_rank = rank;
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
            const hash = crypto.createHash('sha1');
            pets_checksum = hash.update(pets_string).digest('hex');
            result.checksum.petSlots = petSlots;
            result.checksum.pets = pets_checksum;
        }
        if (mounts) {
            let mount_array = [];
            for (let i = 0; i < mounts.length; i++) {
                mount_array.push(mounts[i].mount.id)
            }
            const hash = crypto.createHash('sha1');
            mounts_checksum = hash.update(Buffer.from(mount_array)).digest('hex');
            result.checksum.mounts = mounts_checksum;
        }
        return result;
    } catch (e) {
        if (typeof e.code != 'undefined' && e.code  === 'ECONNRESET') {
            console.error(`${getCharacter.name},${characterName}@${realmSlug}`);
        }
        if (typeof e.response != 'undefined' && e.response.status === 404) {
            console.error(`${getCharacter.name},${characterName}@${realmSlug}`);
        }
        return {name: characterName, realm: realmSlug}
    }
}

module.exports = getCharacter;