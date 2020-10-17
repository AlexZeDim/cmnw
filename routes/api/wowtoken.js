const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const wowtoken_db = require('../../db/models/wowtoken_db');

/**
 * Modules
 */

router.get('/:region', async function (req, res) {
  try {
    let { region } = req.params;
    let wowtoken = await wowtoken_db
      .findOne({ region: region })
      .sort({ _id: -1 })
      .lean();
    if (wowtoken) {
      await res.status(200).json(wowtoken);
    } else {
      await res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
