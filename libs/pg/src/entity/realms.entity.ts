import { CMNW_ENTITY_ENUM } from '@app/pg/enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: CMNW_ENTITY_ENUM.REALMS })
export class RealmsEntity {
  @PrimaryColumn('int')
  id: number;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  slug: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  name: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  region: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'name_locale',
  })
  nameLocale: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'slug_locale',
  })
  slugLocale: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  category: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  locale: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
  })
  timezone: string;

  @Column({
    default: null,
    nullable: true,
    type: 'varchar',
    name: 'population_status',
  })
  populationStatus: string;

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'connected_realm_id',
  })
  connectedRealmId: number;

  @Column({
    array: true,
    nullable: true,
    type: 'int',
    name: 'connected_realms',
  })
  connectedRealms: number[];

  @Column({
    default: null,
    nullable: true,
    type: 'int',
    name: 'warcraft_logs_id',
  })
  warcraftLogsId: number;

  @Column({
    default: null,
    nullable: true,
    type: 'bigint',
    name: 'auctions_timestamp',
  })
  auctionsTimestamp: number;

  @Column({
    default: null,
    nullable: true,
    type: 'bigint',
    name: 'valuations_timestamp',
  })
  valuationsTimestamp: number;

  @Column({
    default: null,
    nullable: true,
    type: 'bigint',
    name: 'gold_timestamp',
  })
  goldTimestamp: number;

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
