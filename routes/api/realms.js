const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require('../../db/realms_db');

/**
 * Modules
 */

router.get('/:region', async function (req, res) {
  try {
    let { region } = req.params;
    let realms = await realms_db.find({ region: region });
    if (realms && realms.length) {
      await res.status(200).json(realms);
    } else {
      await res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
