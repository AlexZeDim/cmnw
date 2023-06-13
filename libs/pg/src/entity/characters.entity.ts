import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { OSINT_SOURCE } from '@app/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('ix__characters__guid', ['guid'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS })
export class CharactersEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    // TODO default value function,
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
  guild?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'guild_guid',
  })
  guildGuid?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'guild_id',
  })
  guildId?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'guild_rank',
  })
  guildRank?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'hash_a',
  })
  hashA?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'hash_b',
  })
  hashB?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'hash_f',
  })
  hashF?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  race?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  class?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  specialization?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  gender?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  faction?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
  })
  level?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'achievement_points',
  })
  achievementPoints?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'avg_item_level',
  })
  averageItemLevel?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'eq_item_level',
  })
  equippedItemLevel?: number;

  @Column({
    default: 100,
    nullable: true,
    type: 'int',
    name: 'status_code',
  })
  statusCode?: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'covenant_id',
  })
  covenantId?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'avatar_image',
  })
  avatarImage?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'inset_image',
  })
  insetImage?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'main_image',
  })
  mainImage?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'mounts_number',
  })
  mountsNumber?: number;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'pets_number',
  })
  petsNumber?: number;

  // TODO professions

  // TODO LFG to separate table

  // TODO rio score separate table

  @Column({
    default: OSINT_SOURCE.CHARACTER_GET,
    nullable: true,
    type: 'varchar',
    name: 'created_by',
  })
  createdBy?: OSINT_SOURCE;

  @Column({
    default: OSINT_SOURCE.CHARACTER_INDEX,
    nullable: true,
    type: 'varchar',
    name: 'updated_by',
  })
  updatedBy: OSINT_SOURCE;

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
