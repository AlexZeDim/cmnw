const express = require("express");
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require("../../../db/realms_db");
const osint_logs = require("../../../db/osint_logs_db");

/**
 * Modules
 */

router.get("/:nameSlug@:realmSlug", async function (req, res) {
  try {
    let { nameSlug, realmSlug } = req.params;
    nameSlug = nameSlug.toLowerCase();

    if (nameSlug && realmSlug) {
      let characterLogs = await osint_logs
        .find({ type: "character", root_id: `${nameSlug}@${realmSlug}` })
        .sort({ before: -1 })
        .lean();
      if (!characterLogs.length) {
        let realm = await realms_db.findOne({ $text: { $search: realmSlug } });
        if (realm) {
          characterLogs = await osint_logs
            .find({ type: "character", root_id: `${nameSlug}@${realmSlug}` })
            .sort({ before: -1 })
            .lean();
        } else {
          await res.status(404).json({ error: "Not found" });
        }
      }
      await res.status(200).json(characterLogs);
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
