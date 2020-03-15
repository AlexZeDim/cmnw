const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const guilds_db = require("../../db/guilds_db");

router.get('/:name@:realm', async function(req, res) {
    try {
        let { slug } = await realms_db.findOne({$or: [
                { 'name': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'slug': req.params.realm },
                { 'name_locale': (req.params.realm).replace(/^\w/, c => c.toUpperCase()) },
                { 'ticker': req.params.realm },
            ]});
        let guildData = await guilds_db.findById(`${req.params.name.toLowerCase()}@${slug}`);
        if (!guildData) {
            const getGuild = require('../../voluspa/getGuild');
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `VOLUSPA-indexGuilds`});
            guildData = await getGuild(slug, req.params.name.toLowerCase(), token);
            guildData.createdBy = `VOLUSPA-userInput`;
            guildData.updatedBy = `VOLUSPA-userInput`;
            if (guildData.statusCode === 200) {
                await guilds_db.create(guildData).then(ch => console.info(`C,${ch._id}`));
                guildData.createdAt = Date.now();
                guildData.updatedAt = Date.now();
            }
        }
        res.status(200).json(guildData);
    } catch (e) {
        res.status(404).json(e);
    }
});

module.exports = router;