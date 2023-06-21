import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.KEYS })
export class KeysEntity {
  @PrimaryGeneratedColumn('uuid')
  readonly uuid: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  client?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  secret?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  token?: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'expired_in',
  })
  expiredIn?: number;

  @Column({
    array: true,
    nullable: true,
    type: 'character varying',
  })
  tags: string[];

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
