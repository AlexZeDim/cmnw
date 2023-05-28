import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { CMNW_ENTITY_ENUM } from "@app/pg";

@Entity({ name: CMNW_ENTITY_ENUM.MOUNTS })
export class MountsEntity {
  @PrimaryColumn('int')
  id: number;

  @Column({
    nullable: true,
    type: 'varchar',
  })
  name?: string;

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
