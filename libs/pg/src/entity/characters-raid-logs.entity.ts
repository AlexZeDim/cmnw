import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CMNW_ENTITY_ENUM } from '@app/pg';

@Index('ix__characters_raid__log_id', ['logId'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_RAID_LOGS })
export class CharactersRaidLogsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  readonly logId: string;

  @Column({
    default: false,
    type: 'boolean',
  })
  isIndexed: boolean;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'indexed_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  indexedAt?: Date;

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
