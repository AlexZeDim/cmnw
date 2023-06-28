import { CMNW_ENTITY_ENUM } from '@app/pg';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.ITEMS })
export class ItemsEntity {
  @PrimaryColumn('int')
  readonly id: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  name?: string;

  @Column({
    nullable: false,
    default: {},
    type: 'jsonb',
  })
  names?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  quality?: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'item_level',
  })
  itemLevel?: number;

  @Column({
    nullable: true,
    type: 'int',
  })
  level?: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  icon?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'item_class',
  })
  itemClass?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'item_sub_class',
  })
  itemSubClass?: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'purchase_price',
  })
  purchasePrice?: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'purchase_quantity',
  })
  purchaseQuantity?: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'vendor_sell_price',
  })
  vendorSellPrice?: number;

  @Column({
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'is_equip',
  })
  isEquip?: boolean;

  @Column({
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'is_stackable',
  })
  isStackable?: boolean;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'inventory_type',
  })
  inventoryType?: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'loot_type',
  })
  lootType?: string;

  @Column({
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'has_contract',
  })
  hasContracts?: boolean;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
    name: 'asset_class',
  })
  assetClass?: string[];

  @Column({
    nullable: true,
    type: 'varchar',
  })
  expansion?: string;

  @Column({
    nullable: true,
    type: 'int',
  })
  stackable?: number;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'profession_class',
  })
  professionClass?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  ticker?: string;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
  })
  tags: string[];

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'index_by',
  })
  indexBy?: string;

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
