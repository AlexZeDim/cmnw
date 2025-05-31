import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg';
import { DMA_SOURCE, ItemNames, ItemPricing } from '@app/core';

// @todo index
@Entity({ name: CMNW_ENTITY_ENUM.PRICING })
export class PricingEntity {
  @PrimaryColumn('int')
  readonly id: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  ticker?: string;

  @Column({
    nullable: false,
    default: {},
    type: 'jsonb',
  })
  names?: string | ItemNames;

  @Column({
    nullable: false,
    default: {},
    type: 'jsonb',
  })
  description: string | ItemNames;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  faction?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  media: string;

  /**
   * API or LOCAL
   *
   * SkillLineAbility.lua
   * see https://us.forums.blizzard.com/en/blizzard/t/bug-professions-api/6234 for details
   *
   * Build from item_id & item_quantity
   * for massive Proportion evaluation
   * {id: Number, Quantity: Number}
   */
  @Column({
    nullable: true,
    default: () => "'[]'",
    type: 'jsonb',
  })
  derivatives: string | Array<ItemPricing>;

  @Column({
    nullable: true,
    default: () => "'[]'",
    type: 'jsonb',
  })
  reagents: string | Array<ItemPricing>;

  @Column({
    nullable: false,
    type: 'int',
    name: 'recipe_id'
  })
  recipeId: number;

  @Column({
    nullable: true,
    default: null,
    type: 'int',
    name: 'spell_id'
  })
  spellId: number;

  @Column({
    array: true,
    nullable: true,
    type: 'int',
    name: 'modified_crafting_slots',
  })
  modifiedCraftingSlots: number[]

  // -- if from local source then convert from SkillLine -- //
  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  profession: string;

  /** API */
  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  expansion: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
  })
  rank: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  type: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'single_premium',
  })
  singlePremium: number;

  @Column({
    default: DMA_SOURCE.API,
    nullable: true,
    type: 'varchar',
    name: 'created_by',
  })
  createdBy?: DMA_SOURCE;

  @Column({
    default: DMA_SOURCE.API,
    nullable: true,
    type: 'varchar',
    name: 'updated_by',
  })
  updatedBy: DMA_SOURCE;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;
}
