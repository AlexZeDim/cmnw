import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { IActionsModifier, MARKET_TYPE, IPetList } from '@app/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('ix__market__item_id', ['itemId'], {})
@Index('ix__market__connected_realm_id', ['connectedRealmId'], {})
@Index('ix__market__timestamp', ['timestamp'], {})
@Entity({ name: CMNW_ENTITY_ENUM.MARKET })
export class MarketEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'order_id',
  })
  orderId?: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'item_id',
  })
  itemId?: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'connected_realm_id',
  })
  connectedRealmId?: number;

  @Column({
    nullable: true,
    type: 'int',
  })
  context?: number;

  @Column({
    array: true,
    nullable: true,
    type: 'int',
    name: 'bonus_list',
  })
  bonusList?: number[] | null;

  @Column({
    type: 'jsonb',
    array: false,
    // default: () => "'[]'",
    nullable: true,
  })
  modifiers?: Array<IActionsModifier> | null;

  @Column({
    type: 'jsonb',
    array: false,
    // default: () => "'[]'",
    nullable: true,
    name: 'pet_list',
  })
  petList?: Array<IPetList> | null;

  @Column({
    nullable: false,
    type: 'real',
  })
  price: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  bid: number;

  @Column({
    default: 1,
    nullable: true,
    type: 'int',
  })
  quantity?: number;

  @Column({
    nullable: true,
    type: 'real',
  })
  value?: number;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'time_left',
  })
  timeLeft?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  faction: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  counterparty: string;

  @Column({
    nullable: true,
    type: 'boolean',
    name: 'is_online',
  })
  isOnline: boolean;

  @Column({
    default: MARKET_TYPE.A,
    nullable: true,
    type: 'varchar',
  })
  type?: MARKET_TYPE;

  @Column({
    nullable: true,
    type: 'bigint',
  })
  timestamp?: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
