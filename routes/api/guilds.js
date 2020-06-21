const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require("../../db/realms_db");
const guilds_db = require("../../db/guilds_db");
const {toSlug} = require("../../db/setters");

/**
 * Modules
 */

router.get('/:g@:r', async function(req, res) {
    try {
        let {g, r} = req.params;
        let { slug } = await realms_db.findOne({$text:{$search: r}});
        if (g && slug) {
            let guildData = await guilds_db.findById(`${toSlug(g)}@${slug}`).lean();
            if (!guildData) {
                const getGuild = require('../../osint/getGuild');
                const keys_db = require("../../db/keys_db");
                const { token } = await keys_db.findOne({tags: `OSINT-indexGuilds`});
                guildData = await getGuild(slug, toSlug(g), token, `OSINT-userInput`);
            }
            let [json] = await guilds_db.aggregate([
                {
                    $match: {
                        _id: guildData._id
                    }
                },
                {
                    $lookup: {
                        from: "characters",
                        let: {
                            members: "$members"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: [
                                            "$_id",
                                            "$$members._id"
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "members"
                    }
                },
            ])
            await res.status(200).json(json);
        } else {
            await res.status(404).json({error: "not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;