/**
 * Mongo Models
 */
require('../../../db/connection')

const spell_reagents_db = require('../../../db/models/spell_reagents_db');
const spell_effect_db = require('../../../db/models/spell_effect_db');
const skill_line_db = require('../../../db/models/skill_line_db');

/**
 * Modules
 */

const csv = require('csv');
const fs = require('fs');

/**
 *
 * API => skilllineability (spell_ID) => spelleffect (item_quantity)
 * OR (LABS)
 * spell_reagents => skilllineability => spelleffect => API
 *
 * @param path {string}
 * @returns {Promise<void>}
 */

async function indexMethodsCSV(path) {
  try {
    const file = fs.readFileSync(path, 'utf8');

    let model_db;

    if (path.includes('spelleffect')) model_db = spell_effect_db

    if (path.includes('spellreagents')) model_db = spell_reagents_db

    if (path.includes('skilllineability')) model_db = skill_line_db


    if (!model_db) return

    csv.parse(file, async function (err, data) {
      console.time('Importing')
      const L = data.length;

      for (let i = 1; i < L; i++) {
        const row = {};
        /** Form object from each row */
        await Promise.all([
          data[i].map((row_value, i) => {
            if (!isNaN(row_value)) {
              row_value = parseInt(row_value);
            }
            Object.assign(row, { [data[0][i]]: row_value });
          }),
        ]);

        /**
         *  SpellEffectDB
         *
         *  Effect - effect flag
         *  EffectItemType - item_id
         *  EffectBasePointsF - item_quantity
         *  spellID - spell_id
         */
        if ('SpellID' in row) row.spell_id = row.SpellID
        if ('Effect' in row) row.effect = row.Effect
        if ('EffectItemType' in row) row.item_id = row.EffectItemType
        if ('EffectBasePointsF' in row) row.item_quantity = row.EffectBasePointsF
        /**
         * SkillLine
         *
         * SkillLine - professionID
         * Spell - spellID
         * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
         * MinSkillLineRank - require skill points
         * Flags: 0 or 16 ??????
         * NumSkillUps - skill points up on craft
         * TrivialSkillLineRankHigh - greenCraftQ
         * TrivialSkillLineRankLow - yellowCraftQ
         * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
         */
        if ('SkillLine' in row) row.skill_line = row.SkillLine
        if ('Spell' in row) row.spell_id = row.Spell

        if ('SupersedesSpell' in row) row.supersedes_spell = row.SupersedesSpell
        if ('MinSkillLineRank' in row) row.min_skill_rank = row.MinSkillLineRank
        if ('NumSkillUps' in row) row.num_skill_ups = row.NumSkillUps
        if ('TrivialSkillLineRankHigh' in row) row.green_craft = row.TrivialSkillLineRankHigh
        if ('TrivialSkillLineRankLow' in row) row.yellow_craft = row.TrivialSkillLineRankLow
        if ('SkillUpSkillLineID' in row) row.skill_up_skill_line_id = row.SkillUpSkillLineID

        if (path.includes('spellreagents')) {
          const reagentsIndex = [2, 3, 4, 5, 6, 7, 8, 9];
          const quantityIndex = [10, 11, 12, 13, 14, 15, 16, 17];

          for (let r = 0; r < reagentsIndex.length; r++) {
            if (data[i][reagentsIndex[r]] !== '0') {
              row.reagents = [];
              row.reagents.push({
                _id: parseInt(data[i][reagentsIndex[r]]),
                quantity: parseInt(data[i][quantityIndex[r]])
              });
            }
          }
        }

        if ('ID' in row) {
          row._id = row.ID
          const document = await model_db.findByIdAndUpdate(
            row._id,
            row,
    {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              lean: true,
            }
          )
          console.info(document)
        }
        /**
         * Clear Object
         */
        for (let key in row) {
          delete row[key];
        }
      }
      console.timeEnd('Importing')
      process.exit(0)
    });
  } catch (error) {
    console.log(error);
  }
}

indexMethodsCSV('C:\\Projects\\conglomerat\\uploads\\spellreagents.csv');
