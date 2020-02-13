const battleNetWrapper = require('battlenet-api-wrapper');
const crypto = require('crypto');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getCharacter (realmSlug, characterName) {
    const bnw = new battleNetWrapper();
    await bnw.init(clientId, clientSecret, 'eu', 'en_GB');
    let pets_checksum, mounts_checksum;
    let petSlots = [];
    const {id, name, gender, faction, race, character_class, active_spec, realm, guild, level, last_login_timestamp, average_item_level, equipped_item_level} = await bnw.WowProfileData.getCharacterSummary(realmSlug, characterName);
    const {pets, unlocked_battle_pet_slots} = await bnw.WowProfileData.getCharacterPetsCollection(realmSlug, characterName);
    const {mounts} = await bnw.WowProfileData.getCharacterMountsCollection(realmSlug, characterName);
    if (guild) {
        console.log(guild)
    }
    if (pets) {
        let pets_string = '';
        for (let i = 0; i < pets.length; i++) {
            if (pets[i].hasOwnProperty('is_active')) {
                petSlots.push(pets[i])
            }
            if (typeof pets[i].name === 'undefined') {
                pets_string += pets[i].species.name
            } else {
                pets_string += pets[i].name
            }
        }
        const hash = crypto.createHash('sha1');
        pets_checksum = hash.update(pets_string).digest('hex');
    }
    if (mounts) {
        let mount_array = [];
        for (let i = 0; i < mounts.length; i++) {
            mount_array.push(mounts[i].mount.id)
        }
        const hash = crypto.createHash('sha1');
        mounts_checksum = hash.update(Buffer.from(mount_array)).digest('hex');
    }
    console.log(realm);
}

getCharacter('gordunni', 'инициатива');