const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function getGuild (realmSlug, nameSlug, token = '') {
    try {
        //FIXME actual timestamp from lastModified header
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, token, 'eu', 'en_GB');
        const [{id, name, faction, achievement_points, member_count, realm, crest, created_timestamp, lastModified }, {members}] = await Promise.all([
            bnw.WowProfileData.getGuildSummary(realmSlug, nameSlug),
            bnw.WowProfileData.getGuildRoster(realmSlug, nameSlug),
        ]);
        console.info(`U,${getGuild.name},${nameSlug}@${realmSlug}:${id},${member_count}`);
        return ({
            _id: `${nameSlug}@${realmSlug}`,
            id: id,
            name: name,
            slug: nameSlug,
            faction: faction.name,
            achievement_points: achievement_points,
            member_count: member_count,
            realm: realm.name,
            realm_slug: realmSlug,
            crest: crest,
            lastModified: lastModified,
            created_timestamp: moment(created_timestamp).toISOString(true),
            members: members
        });
    } catch (error) {
        console.error(`E,${getGuild.name},${nameSlug}@${realmSlug},${error}`);
        return {_id: `${nameSlug}@${realmSlug}`, slug: nameSlug, realm_slug: realmSlug}
    }

}

getGuild('galakrond','безмятежность','EUUFsZ2i2A1Lrp2fMWdCO24Sk9q1Hr3cP5');

module.exports = getGuild;