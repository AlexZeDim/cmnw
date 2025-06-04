import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  CharactersProfileEntity,
  CharactersRaidLogsEntity,
  ContractEntity,
  GuildsEntity,
  ItemsEntity,
  KeysEntity,
  LogsEntity,
  MarketEntity,
  MountsEntity,
  PetsEntity,
  PricingEntity,
  ProfessionsEntity,
  RealmsEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
} from '@app/pg';

export const postgresConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  logging: false,
  entities: [
    CharactersEntity,
    CharactersGuildsMembersEntity,
    CharactersMountsEntity,
    CharactersPetsEntity,
    CharactersProfessionsEntity,
    CharactersProfileEntity,
    CharactersRaidLogsEntity,
    GuildsEntity,
    KeysEntity,
    MountsEntity,
    PetsEntity,
    ProfessionsEntity,
    RealmsEntity,
    LogsEntity,
    MarketEntity,
    ItemsEntity,
    ContractEntity,
    PricingEntity,
    SkillLineEntity,
    SpellEffectEntity,
    SpellReagentsEntity
  ],
  synchronize: true,
  namingStrategy: new SnakeNamingStrategy(),
  ssl: process.env.POSTGRES_SSL === 'true'
    ? {
        ca: readFileSync(process.env.POSTGRES_SSL_CA, 'utf-8'),
        key: process.env.PG_SSL_KEY
          ? readFileSync(process.env.POSTGRES_SSL_KEY, 'utf-8')
          : null,
        cert: process.env.PG_SSL_CERT
          ? readFileSync(process.env.POSTGRES_SSL_CERT, 'utf-8')
          : null,
      }
    : null,
};
