import '../db/mongo/mongo.connection';
import fs from 'fs-extra';
import path from 'path';
import csv from 'async-csv';
import { SpellEffectModel, SkillLineModel, SpellReagentsModel } from "../db/mongo/mongo.model";

(async () => {
  try {
    const dir = path.join(__dirname, '..', '..', 'import');
    await fs.ensureDir(dir);
    const files = await fs.readdir(dir);
    for (const file of files) {

      let Model;

      if (file === 'skilllineability.csv') Model = SkillLineModel;
      if (file === 'spelleffect.csv') Model = SpellEffectModel;
      if (file === 'spellreagents.csv') Model = SpellReagentsModel;

      if (!Model) continue

      const csvString = await fs.readFile(path.join(dir, file), 'utf-8');

      const rows: any[] = await csv.parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        cast: value => (!isNaN(value as any)) ? parseInt(value) : value
      });

      for (const row of rows) {
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

        if (file.includes('spellreagents')) {
          const
            reagentsKeyIndex: number[] = [2, 3, 4, 5, 6, 7, 8, 9],
            quantityIndex: number[] = [10, 11, 12, 13, 14, 15, 16, 17],
            row_value: any[] = Object.values(row),
            reagents: { _id: number, quantity: number}[] = [];

          reagentsKeyIndex.map((n, i) => {
            if (row_value[n] !== 0) {
              reagents.push({
                _id: row_value[n],
                quantity: row_value[quantityIndex[i]]
              })
            }
          })

          row.reagents = reagents;
        }

        if ('ID' in row) {
          row._id = row.ID
          const document = await Model.findByIdAndUpdate(row._id, row,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              lean: true,
            }
          )
          console.info(document)
        }
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    process.exit(0)
  }
})()
