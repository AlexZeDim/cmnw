const express = require('express');
const router = express.Router();

const realms_db = require("../../db/realms_db");
const guilds_db = require("../../db/guilds_db");

router.get('/:g@:r', async function(req, res) {
    try {
        let {g, r} = req.params;
        g = g.toLowerCase().replace(/\s/g,"-");
        let { slug } = await realms_db.findOne({$text:{$search: r}});
        let guildData = await guilds_db.findById(`${g}@${slug}`);
        if (!guildData) {
            const getGuild = require('../../osint/getGuild');
            const keys_db = require("../../db/keys_db");
            const { token } = await keys_db.findOne({tags: `OSINT-indexGuilds`});
            guildData = await getGuild(slug, g, token);
            guildData.createdBy = `OSINT-userInput`;
            guildData.updatedBy = `OSINT-userInput`;
            if (guildData.statusCode === 200) {
                await guilds_db.create(guildData).then(g => console.info(`C,${g._id}`));
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