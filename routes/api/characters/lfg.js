const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const characters_db = require('../../../db/models/characters_db');

/**
 * Modules
 */

router.get('/:query', async function (req, res) {
  try {
    let { query } = req.params;
    if (query === 'all') {
      const All = await characters_db.find({isWatched: true, updatedBy: 'OSINT-LFG'}).limit(25).lean();
      await res.status(200).json(All);
    } else if (query === 'new') {
      const New = await characters_db.find({isWatched: true, updatedBy: 'OSINT-LFG-NEW'}).limit(25).lean();
      await res.status(200).json(New);
    } else {
      await res.status(404);
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
