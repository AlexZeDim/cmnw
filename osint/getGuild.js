const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');
const guild_db = require("../db/guilds_db");
const characters_db = require("../db/characters_db");

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getGuild (realmSlug, nameSlug, token = '', updatedBy = `DMA-${getGuild.name}`) {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        let guild = new guild_db({
            _id: `${nameSlug}@${realmSlug}`,
            statusCode: 400,
            updatedBy: updatedBy,
            isWatched: false
        })
        await Promise.all([
            bnw.WowProfileData.getGuildSummary(realmSlug, nameSlug).then(({id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, lastModified, statusCode }) => {
                guild.id = id;
                guild.name = name;
                guild.faction = faction.name;
                guild.realm_slug = realmSlug;
                guild.realm = realm.name;
                guild.crest = crest;
                guild.achievement_points = achievement_points;
                guild.member_count = member_count;
                guild.lastModified = moment(lastModified).toISOString(true);
                guild.created_timestamp = moment(created_timestamp).toISOString(true);
                guild.statusCode = statusCode;
            }),
            bnw.WowProfileData.getGuildRoster(realmSlug, nameSlug).then(async ({members}) => {
                for (let member of members) {
                    let {character, rank} = member
                    //TODO find char if not exists, getChar character.realm.slug
                    guild.members_latest.push({
                        character_id: character.id,
                        character_name: character.name,
                        character_rank: rank,
                        character_hash_A: '',
                        character_hash_B: ''
                    })
                }
            }),
        ])
        if (guild.statusCode === 200) {
            /**
             * Detective:IndexDB
             * TODO check for faction/realm/name
             */
            let guild_check = await guild_db.findOne({
                id: guild.id,
            }).lean();
        }
        let isCreated = await guild_db.findById(`${nameSlug}@${realmSlug}`).lean();
        if (!isCreated) {
            guild.createdBy = updatedBy;
        }
        if (guild.members_latest.length > 0 && isCreated) {

        }
    } catch (error) {
        console.error(`E,${getGuild.name},${nameSlug}@${realmSlug},${error}`);
    }
}

getGuild('gordunni','депортация','EUUFsZ2i2A1Lrp2fMWdCO24Sk9q1Hr3cP5').then(r=>console.log(r))

module.exports = getGuild;