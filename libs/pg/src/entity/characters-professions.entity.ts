import { CMNW_ENTITY_ENUM } from '@app/pg';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_PROFESSIONS })
export class CharactersProfessionsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'profession_id',
  })
  professionId: number;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid: string;

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
