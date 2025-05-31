import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg';

/**
 *  TODO description
 *  Effect - effect flag
 *  EffectItemType - item_id
 *  EffectBasePointsF - item_quantity
 *  spellID - spell_id
 */

@Entity({ name: CMNW_ENTITY_ENUM.SPELL_EFFECT })
export class SpellEffectEntity {
  @PrimaryColumn('int')
  readonly id: number;

  @Column({
    nullable: true,
    type: 'int',
  })
  effect: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'item_id'
  })
  itemId: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'item_quantity'
  })
  itemQuantity: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'spell_id'
  })
  spellId: number;
}
