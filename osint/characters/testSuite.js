require('./../../db/connection');
const characters_db = require('../../db/models/characters_db');
const { getLookingForGuild } = require('./get_lfg');
const { updateWProgress, updateRaiderIO, updateWarcraftLogs } = require('./updaters');
const { differenceBy } = require('lodash');


(async function T () {
  try {
    const x = await Promise.allSettled([
      await updateWarcraftLogs('Лумиваара', 'howling-fjord'),
      await updateWProgress('Лумиваара', 'howling-fjord'),
      await updateRaiderIO('Лумиваара', 'howling-fjord'),
    ])
    console.log(x)
  } catch (e) {
    console.error(e)
  }
})();
