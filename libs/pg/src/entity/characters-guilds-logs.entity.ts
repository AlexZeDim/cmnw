import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import { ACTION_LOG, EVENT_LOG } from '@app/resources';
import {
  Column,
  CreateDateColumn,
  Entity, Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('ix__characters_guilds_logs__character_guid', ['characterGuid'], {})
@Index('ix__characters_guilds_logs__guild_guid', ['guildGuid'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_GUILDS_LOGS })
export class CharactersGuildsLogsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  characterGuid?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  guildGuid?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  original?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  updated?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  action!: ACTION_LOG;

  @Column({
    type: 'timestamp with time zone',
    name: 'scanned_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  scannedAt?: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
