import { get } from 'config';
import { IPostgresConfig } from '@app/configuration/interfaces';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  GuildsEntity,
  KeysEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
} from '@app/pg';

const POSTGRES_DB_CONFIG = get<IPostgresConfig>('postgres');

export const postgresConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: POSTGRES_DB_CONFIG.host,
  port: POSTGRES_DB_CONFIG.port,
  username: POSTGRES_DB_CONFIG.username,
  password: POSTGRES_DB_CONFIG.password,
  database: POSTGRES_DB_CONFIG.database,
  logging: true,
  entities: [
    CharactersEntity,
    CharactersGuildsMembersEntity,
    CharactersMountsEntity,
    CharactersPetsEntity,
    CharactersProfessionsEntity,
    GuildsEntity,
    KeysEntity,
    MountsEntity,
    PetsEntity,
    ProfessionsEntity,
  ],
  synchronize: false,
  keepConnectionAlive: true,
  ssl: !!POSTGRES_DB_CONFIG.ssl
    ? {
        ca: readFileSync(POSTGRES_DB_CONFIG.ssl?.ca, 'utf-8'),
        key: POSTGRES_DB_CONFIG.ssl?.key
          ? readFileSync(POSTGRES_DB_CONFIG.ssl?.key, 'utf-8')
          : null,
        cert: POSTGRES_DB_CONFIG.ssl?.cert
          ? readFileSync(POSTGRES_DB_CONFIG.ssl?.cert, 'utf-8')
          : null,
      }
    : null,
};
