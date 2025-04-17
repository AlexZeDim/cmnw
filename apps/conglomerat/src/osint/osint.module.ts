import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';
import { charactersQueue, guildsQueue } from '@app/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersGuildsMembersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  CharactersProfessionsEntity,
  CharactersProfileEntity,
  GuildsEntity,
  KeysEntity,
  LogsEntity,
  MountsEntity,
  PetsEntity,
  ProfessionsEntity,
  RealmsEntity,
} from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      CharactersEntity,
      CharactersGuildsMembersEntity,
      CharactersMountsEntity,
      CharactersPetsEntity,
      CharactersProfessionsEntity,
      CharactersProfileEntity,
      GuildsEntity,
      KeysEntity,
      MountsEntity,
      PetsEntity,
      ProfessionsEntity,
      RealmsEntity,
      LogsEntity,
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
      },
    }),
    BullModule.registerQueue({
      queueName: charactersQueue.name,
      options: charactersQueue.options,
    }),
    BullModule.registerQueue({
      queueName: guildsQueue.name,
      options: guildsQueue.options,
    }),
  ],
  controllers: [OsintController],
  providers: [OsintService],
})
export class OsintModule {}
