import {prop, modelOptions} from '@typegoose/typegoose';

/**
 * This schema is dependent to DMA and updates only on build stage
 * from a local file
 * FIXME correct the desc
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
 */
@modelOptions({ schemaOptions: { timestamps: false, collection: 'skill_line' }, options: { customName: 'skill_line' } })

export class SkillLine {
  @prop({ required: true })
  public _id!: number;
  @prop({ required: true })
  public skill_line!: number;
  @prop({ required: true, index: true })
  public spell_id!: number;
  @prop({ required: true })
  public supersedes_spell!: number;
  @prop({ required: true })
  public min_skill_rank!: number;
  @prop({ required: true })
  public num_skill_ups!: number;
  @prop({ required: true })
  public green_craft!: number;
  @prop({ required: true })
  public yellow_craft!: number;
  @prop({ required: true })
  public skill_up_skill_line_id!: number;
  @prop({ required: true })
  public version!: number;
}
