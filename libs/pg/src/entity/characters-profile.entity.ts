import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { LFG_STATUS, IRaiderIORaidProgress } from '@app/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.PROFILE })
export class CharactersProfileEntity {
  @PrimaryColumn('varchar')
  readonly guid: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  name: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'realm_id',
  })
  realmId: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  realm: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  race: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  class: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  gender: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'active_spec',
  })
  activeSpec: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'active_role',
  })
  activeRole: string;

  @Column({
    nullable: true,
    default: {},
    type: 'jsonb',
    name: 'raid_progress',
  })
  raidProgress: IRaiderIORaidProgress;

  @Column({
    nullable: true,
    type: 'real',
    name: 'raider_io',
  })
  raiderIoScore: number;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'play_role',
  })
  playRole: string;

  @Column({
    array: true,
    nullable: true,
    type: 'int',
    name: 'raid_days',
  })
  raidDays: number[];

  @Column({
    default: null,
    nullable: true,
    type: 'boolean',
    name: 'is_transfer',
  })
  readyToTransfer: boolean;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'battle_tag',
  })
  battleTag?: string;

  @Column({
    nullable: true,
    type: 'real',
    name: 'mythic_logs',
  })
  heroicLogs?: number;

  @Column({
    nullable: true,
    type: 'real',
    name: 'mythic_logs',
  })
  mythicLogs?: number;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
  })
  languages: Array<string>;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'lfg_status',
  })
  lfgStatus: LFG_STATUS;

  @Column('timestamp with time zone', {
    name: 'modified_by_rio',
    nullable: true,
  })
  updatedByRaiderIo?: Date;

  @Column('timestamp with time zone', {
    name: 'modified_by_wp',
    nullable: true,
  })
  updatedByWowProgress?: Date;

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
