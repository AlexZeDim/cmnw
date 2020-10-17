const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require('../../../db/models/realms_db');
const guilds_db = require('../../../db/models/guilds_db');
const { toSlug } = require('../../../db/setters');

/**
 * Modules
 */

router.get('/:guildSlug@:realmSlug', async function (req, res) {
  try {
    let { guildSlug, realmSlug } = req.params;
    guildSlug = toSlug(guildSlug);

    let guildData = await guilds_db
      .findById(`${guildSlug}@${realmSlug}`)
      .lean();

    if (!guildData) {
      let realm = await realms_db.findOne({
        $text: { $search: realmSlug },
      });
      if (realm) {
        guildData = await guilds_db
          .findById(`${guildSlug}@${realm.slug}`)
          .lean();
        if (!guildData) {
          const getGuild = require('../../../osint/getGuild');
          const keys_db = require('../../../db/models/keys_db');
          const { token } = await keys_db.findOne({
            tags: `OSINT-indexGuilds`,
          });
          await getGuild(realm.slug, guildSlug, token, `OSINT-userInput`);
          guildData = await guilds_db
            .findById(`${guildSlug}@${realm.slug}`)
            .lean();
          if (!guildData) {
            await res.status(404).json({ error: 'Not found' });
          }
        }
      }
    }
    /** $lookup join for members */
    let [json] = await guilds_db.aggregate([
      {
        $match: {
          _id: guildData._id,
        },
      },
      {
        $lookup: {
          from: 'characters',
          localField: 'members._id',
          foreignField: '_id',
          as: 'members',
        },
      },
    ]).allowDiskUse(true);
    await res.status(200).json(json);
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
