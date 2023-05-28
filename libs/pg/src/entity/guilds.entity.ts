import { CMNW_ENTITY_ENUM } from '@app/pg';
import { OSINT_SOURCE } from '@app/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.GUILDS })
export class GuildsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    // TODO function,
    nullable: false,
    type: 'varchar',
  })
  guid: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
  })
  id?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  name: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'realm_id',
  })
  realmId!: number;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'realm_name',
  })
  realmName!: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  realm!: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  faction?: string;

  @Column({
    default: 100,
    nullable: true,
    type: 'int',
    name: 'achievement_points',
  })
  achievementPoints?: number;

  @Column({
    default: 100,
    nullable: true,
    type: 'int',
    name: 'members_count',
  })
  membersCount?: number;

  @Column({
    default: 100,
    nullable: true,
    type: 'int',
    name: 'status_code',
  })
  statusCode?: number;

  @Column({
    default: OSINT_SOURCE.GUILD_GET,
    nullable: true,
    type: 'varchar',
    name: 'created_by',
  })
  createdBy?: string;

  @Column({
    default: OSINT_SOURCE.GUILD_INDEX,
    nullable: true,
    type: 'varchar',
    name: 'updated_by',
  })
  updatedBy?: string;

  @Column('timestamp with time zone', {
    name: 'last_modified',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdTimestamp?: Date;

  @Column('timestamp with time zone', {
    name: 'last_modified',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastModified?: Date;

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
