import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg';

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
@Entity({ name: CMNW_ENTITY_ENUM.SKILL_LINE })
export class SkillLineEntity {
  @PrimaryColumn('int')
  readonly id: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'skill_line'
  })
  skillLine: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'spell_id'
  })
  spellId: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'supersedes_spell'
  })
  supersedesSpell: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'min_skill_rank'
  })
  minSkillRank: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'num_skill_ups'
  })
  numSkillUps: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'green_craft'
  })
  greenCraft: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'yellow_craft'
  })
  yellowCraft: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'skill_up_skill_line_id'
  })
  skillUpSkillLineId: number;
}
