const guild_db = require("../db/guilds_db");
const characters_db = require("../db/characters_db");
const battleNetWrapper = require('battlenet-api-wrapper');

const clientId = '530992311c714425a0de2c21fcf61c7d';
const clientSecret = 'HolXvWePoc5Xk8N28IhBTw54Yf8u2qfP';

async function fromRoster () {
    try {
        const bnw = new battleNetWrapper();
        await bnw.init(clientId, clientSecret, 'eu', 'en_GB');
        let guilds = await guild_db.find({}).cursor();
        for (let guild = await guilds.next(); guild != null; guild = await guilds.next()) {
            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm, guild.slug);
            let bulkCharacters = [];
            for (let i = 0; i < members.length; i++) {
                bulkCharacters.push({
                    _id: `${(members[i].character.name).toLowerCase()}@${guild.realm}`,
                    realm: guild.realm,
                    name: members[i].character.name,
                    source: 'VOLUSPA-roster'
                });
            }
            //TODO message log
            characters_db.insertMany(bulkCharacters, {ordered: false});
        }
    } catch (e) {

    }
}

fromRoster();
