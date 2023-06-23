import { CMNW_ENTITY_ENUM } from '@app/pg';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('ix__characters_pets__pet_id', ['petId'], {})
@Index('ix__characters_pets__character_guid', ['characterGuid'], {})
@Entity({ name: CMNW_ENTITY_ENUM.CHARACTERS_PETS })
export class CharactersPetsEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    nullable: false,
    type: 'int',
    name: 'pet_id',
  })
  petId: number;

  @Column({
    nullable: false,
    type: 'int',
    name: 'creature_id',
  })
  creatureId: number;

  @Column({
    nullable: false,
    type: 'varchar',
    name: 'character_guid',
  })
  characterGuid: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'pet_name',
  })
  petName: string;

  @Column({
    nullable: true,
    type: 'varchar',
    name: 'pet_quality',
  })
  petQuality: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'breed_id',
  })
  breedId: number;

  @Column({
    default: 1,
    nullable: true,
    type: 'integer',
    name: 'pet_level',
  })
  petLevel: number;

  @Column({
    default: false,
    nullable: false,
    type: 'boolean',
    name: 'is_active',
  })
  isActive?: boolean;

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
