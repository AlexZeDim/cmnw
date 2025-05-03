import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { CONTRACT_TYPE } from '@app/core';

@Entity({ name: CMNW_ENTITY_ENUM.CONTRACTS })
export class ContractEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column({
    nullable: false,
    type: 'int',
  })
  itemId: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  connectedRealmId: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  timestamp: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  day: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  week: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  month: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  year: number;

  @Column({
    nullable: false,
    default: 0,
    type: 'real',
    name: 'price',
  })
  price: number;

  @Column({
    nullable: false,
    default: 0,
    type: 'real',
    name: 'price_median',
  })
  priceMedian: number;

  @Column({
    nullable: false,
    default: 0,
    type: 'real',
    name: 'price_top',
  })
  priceTop: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'quantity',
  })
  quantity: number;

  @Column({
    nullable: false,
    default: 0,
    type: 'real',
    name: 'oi',
  })
  openInterest: number;

  @Column({
    default: CONTRACT_TYPE.T,
    nullable: false,
    type: 'varchar',
  })
  type: CONTRACT_TYPE;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
  })
  sellers: Array<string>;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
