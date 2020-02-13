const battleNetWrapper = require('battlenet-api-wrapper');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getGuild (realmSlug, guildName) {
    const bnw = new battleNetWrapper();
    await bnw.init(clientId, clientSecret, 'eu', 'en_GB');
    const {id, name, faction, achievement_points, member_count, realm, crest, created_timestamp } = await bnw.WowProfileData.getGuildSummary(realmSlug, guildName);
    const {members} = await bnw.WowProfileData.getGuildRoster(realmSlug, guildName);
    return ({
        id: id,
        name: name,
        faction: faction,
        achievement_points: achievement_points,
        member_count: member_count,
        realm: realm,
        crest: crest,
        created_timestamp: created_timestamp,
        members: members
    });
}

module.exports = getGuild;