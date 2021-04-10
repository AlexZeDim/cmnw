import { Document } from "mongoose";
import { Prop, SchemaFactory } from '@nestjs/mongoose';

/**
 * This schema is dependent to DMA and updates only on build stage
 * from a local file
 * FIXME correct the desc
 * ID - recipeID
 * SkillLine - professionID
 * Spell - spellID
 * SupersedesSpell - determines RANK of currentSpell, supersedes weak rank
 * MinSkillLineRank - require skill points
 * Flags: 0 or 16 
 * NumSkillUps - skill points up on craft
 * TrivialSkillLineRankHigh - greenCraftQ
 * TrivialSkillLineRankLow - yellowCraftQ
 * SkillUpSkillLineID represent subCategory in professions, for expansionTicker
 */


export class SkillLine {
  @Prop({ required: true })
  _id: number;
  
  @Prop({ required: true })
  skill_line: number;
  
  @Prop({ required: true, index: true })
  spell_id: number;
  
  @Prop({ required: true })
  supersedes_spell: number;
  
  @Prop({ required: true })
  min_skill_rank: number;
  
  @Prop({ required: true })
  num_skill_ups: number;
  
  @Prop({ required: true })
  green_craft: number;
  
  @Prop({ required: true })
  yellow_craft: number;
  
  @Prop({ required: true })
  skill_up_skill_line_id: number;
}

export const SkillLineSchema = SchemaFactory.createForClass(SkillLine);