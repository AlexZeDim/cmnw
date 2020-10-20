const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require('../../../db/models/realms_db');
const characters_db = require('../../../db/models/characters_db');

/**
 * Modules
 */

const moment = require('moment');

router.get('/:nameSlug@:realmSlug', async function (req, res) {
  try {
    let { nameSlug, realmSlug } = req.params;
    nameSlug = nameSlug.toLowerCase();

    if (nameSlug && realmSlug) {
      let characterData = await characters_db
        .findById(`${nameSlug}@${realmSlug}`)
        .lean();
      if (!characterData) {
        let realm = await realms_db.findOne({
          $text: { $search: realmSlug },
        });
        if (realm) {
          let outdated = false;
          characterData = await characters_db
            .findById(`${nameSlug}@${realm.slug}`)
            .lean();
          if (
            characterData &&
            moment(characterData.lastModified).isBefore(
              moment().subtract(30, 'days'),
            )
          ) {
            outdated = true;
          }
          if (!characterData || outdated) {
            const getCharacter = require('../../../osint/characters/get_character');
            const keys_db = require('../../../db/models/keys_db');
            const { token } = await keys_db.findOne({
              tags: `OSINT-indexCharacters`,
            });
            await getCharacter(
              { name: nameSlug, realm: {slug: realm.slug }, createdBy: `OSINT-userInput`, updatedBy: `OSINT-userInput`},
              token,
              true,
              true
            );
            characterData = await characters_db
              .findById(`${nameSlug}@${realm.slug}`)
              .lean();
          }
        }
      }
      await res.status(200).json(characterData);
    } else {
      await res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
