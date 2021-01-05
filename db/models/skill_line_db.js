const mongoose = require('mongoose');

/**
 * ID - recipeID
 * SkillLine - professionID
 * Spell - spellID
 * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
 * MinSkillLineRank - require skill points
 * Flags: 0 or 16 ??????
 * NumSkillUps - skill points up on craft
 * TrivialSkillLineRankHigh - greenCraftQ
 * TrivialSkillLineRankLow - yellowCraftQ
 * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
 *
 */

const schema = new mongoose.Schema(
  {
    _id: Number,
    skill_line: Number,
    spell_id: {
        type: Number,
        index: true
    },
    supersedes_spell: Number,
    min_skill_rank: Number,
    num_skill_ups: Number,
    green_craft: Number,
    yellow_craft: Number,
    skill_up_skill_line_id: Number,
  }
);

const skill_line = mongoose.model('skill_line', schema, 'skill_line');

module.exports = skill_line;
