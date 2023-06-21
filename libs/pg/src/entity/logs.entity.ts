import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { ACTION_LOG, EVENT_LOG } from '@app/core';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.LOGS })
export class LogsEntity {
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
    type: 'varchar',
  })
  original: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  updated: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  event!: EVENT_LOG;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  action!: ACTION_LOG;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'original_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  originalAt?: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;
}
