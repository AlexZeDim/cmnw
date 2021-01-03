require('./../../db/connection');
const characters_db = require('../../db/models/characters_db');
const { getLookingForGuild } = require('./get_lfg');
const { differenceBy } = require('lodash');


(async function T () {
  try {
    //const t = await getLookingForGuild();
    const a = differenceBy([{ 'x': 3 }, { 'x': 1 }], [{ 'x': 1 }, {'x': 2 }], 'x')
    console.log(a)
  } catch (e) {
    console.error(e)
  }
})();
