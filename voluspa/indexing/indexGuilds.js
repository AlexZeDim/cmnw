const guild_db = require("../../db/guilds_db");
const characters_db = require("../../db/characters_db");
const keys_db = require("../../db/keys_db");
const battleNetWrapper = require('battlenet-api-wrapper');
const moment = require('moment');

async function indexGuild (queryFind = '') {
    try {
        let documentBulk = [];
        const { _id, secret, token } = await keys_db.findOne({ tags: `Depo` });
        const bnw = new battleNetWrapper();
        await bnw.init(_id, secret, token, 'eu', 'en_GB');
        let cursor = await guild_db.find(queryFind).cursor({batchSize: 1});
        cursor.on('data', async (documentData) => {
            documentBulk.push(documentData);
            if (documentBulk.length === 1) {
                console.time(`Bulk-${indexGuild.name}`);
                cursor.pause();
                let {slug, realm} = documentData;
                const {id, name, faction, achievement_points, member_count, created_timestamp} = await bnw.WowProfileData.getGuildSummary(realm, slug);
                const {members} = await bnw.WowProfileData.getGuildRoster(realm, slug);
                for (let i = 0; i < members.length; i++) {
                    let {rank} = members[i];
                    let {character} = members[i]; //TODO rank
                    let x = await characters_db.findById(`${(character.name).toLowerCase()}@${character.realm.slug}`).exec(async function (err, char) {
                        if (char) {
                            let {guild_history} = char;
                            let updated_guild_history = guild_history;
                            if (updated_guild_history.length < 1) {
                                char.guild_history.push({rank: rank, name: name, date: moment().format('DD/MM/YY')});
                            } else {
                                for (let i = 0; i < updated_guild_history.length; i++) {
                                    if (!(updated_guild_history[i].name === name && updated_guild_history[i].rank === rank)) {
                                        char.guild_history.push({rank: rank, name: name, date: moment().format('DD/MM/YY')});
                                    }
                                }
                            }
                            console.log(char);
                            char.updatedBy = `VOLUSPA-${indexGuild.name}`;
                            //char.save()
                            /*await characters_db.create({
                                _id: link.match(/(.{16})\s*$/g)[0],
                                realm: 'gordunni', //TODO
                                isIndexed: false,
                                source: `VOLUSPA-${fromLogs.name}`
                            }).then(function (log, error) {
                                if (error) console.error(error);
                                console.info(log)
                            })*/
                        } else {
                            console.log('we are here')
                            console.log(name, realm)
                        }
                    });
                }
                //character.realm
                /*
                const promises = documentBulk.map(async (req) => {
                    try {
                        let { _id } = req;
                        let { exportedCharacters } = await axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${_id}?api_key=${pub_key}`).then(res => {
                            return res.data;
                        });
                        //FIXME for of
                        exportedCharacters.map(async ({name, server}) => {
                            let {slug} = await realms_db.findOne({$or:
                                    [
                                        { 'name_locale': server },
                                        { 'name': server }
                                    ]
                            }).lean().exec();
                            return await characters_db.findByIdAndUpdate(
                                {
                                    _id: `${name.toLowerCase()}@${slug}`
                                },
                                {
                                    _id: `${name.toLowerCase()}@${slug}`,
                                    name: name,
                                    realm_slug: slug,
                                    source: `VOLUSPA-${indexLogs.name}`
                                },
                                {
                                    upsert : true,
                                    new: true,
                                    setDefaultsOnInsert: true,
                                    lean: true
                                }
                            ).exec();
                        });
                        return await logs_db.findByIdAndUpdate(
                            {
                                _id: _id
                            },
                            {
                                isIndexed: true
                            },
                            {
                                upsert : true,
                                new: true,
                                setDefaultsOnInsert: true,
                                lean: true
                            }
                        ).exec();
                    } catch (e) {
                        console.log(e)
                    }
                });
                await Promise.all(promises);*/
                documentBulk = [];
                cursor.close();
                console.timeEnd(`Bulk-${indexGuild.name}`);
            }
        });
        cursor.on('error', error => {
            console.log('B');
            console.error(error);
            cursor.close();
        });
        cursor.on('close', async () => {
            console.log('A');
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('C');
        });
        /*for (let guild = await guilds.next(); guild != null; guild = await guilds.next()) {
            //TODO update guild-info
            //TODO check players and guild change vice-versa // guildhistory
            const {members} = await bnw.WowProfileData.getGuildRoster(guild.realm, guild.slug);
            let bulkCharacters = [];
            for (let i = 0; i < members.length; i++) {
                //TODO one-by-one
                bulkCharacters.push({
                    _id: `${(members[i].character.name).toLowerCase()}@${guild.realm}`,
                    //TODO realm: guild,
                    realm_slug: guild.realm,
                    //TODO guildrank?
                    name: members[i].character.name,
                    source: 'VOLUSPA-roster'
                });
            }
            //TODO message log and fix errors
            characters_db.insertMany(bulkCharacters, {ordered: false});
        }*/
    } catch (e) {

    }
}

indexGuild();