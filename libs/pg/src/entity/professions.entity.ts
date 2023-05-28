import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { CMNW_ENTITY_ENUM } from '@app/pg';

@Entity({ name: CMNW_ENTITY_ENUM.PROFESSIONS })
export class ProfessionsEntity {
  @PrimaryColumn('int')
  id: number;

  @Column({
    nullable: false,
    type: 'varchar',
  })
  name?: string;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  tier?: string;

  @Column({
    nullable: true,
    type: 'int',
    name: 'skill_points',
  })
  skillPoints?: number;

  @Column({
    nullable: true,
    type: 'int',
    name: 'max_skill_points',
  })
  maxSkillPoints?: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  specialization?: string;

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
