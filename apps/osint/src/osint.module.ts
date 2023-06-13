import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { postgresConfig, redisConfig } from '@app/configuration';
import { charactersQueue, guildsQueue } from '@app/core';
import { HttpModule } from '@nestjs/axios';
import { CharactersWorker, GuildsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CharactersEntity,
  CharactersMountsEntity,
  CharactersPetsEntity,
  GuildsEntity,
  KeysEntity,
  LogsEntity,
  MountsEntity,
  PetsEntity,
  RealmsEntity,
} from '@app/pg';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      CharactersEntity,
      GuildsEntity,
      RealmsEntity,
      LogsEntity,
      PetsEntity,
      MountsEntity,
      CharactersPetsEntity,
      CharactersMountsEntity,
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
      queueName: guildsQueue.name,
      options: guildsQueue.options,
    }),
    BullModule.registerQueue({
      queueName: charactersQueue.name,
      options: charactersQueue.options,
    }),
  ],
  controllers: [],
  providers: [CharactersWorker, GuildsWorker],
})
export class OsintModule {}
