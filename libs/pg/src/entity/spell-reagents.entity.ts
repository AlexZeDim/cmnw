import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { ItemPricing } from '@app/core';

@Entity({ name: CMNW_ENTITY_ENUM.SPELL_REAGENTS })
export class SpellReagentsEntity {
  @PrimaryColumn('int')
  readonly id: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'spell_id'
  })
  spellId: number;

  @Column({
    nullable: true,
    default: () => "'[]'",
    type: 'jsonb',
  })
  reagents: string | Array<ItemPricing>
}
