import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import {
  mongoConfig,
  mongoOptionsConfig,
  postgresConfig,
  redisConfig,
} from '@app/configuration';
import { charactersQueue, guildsQueue } from '@app/core';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { CharactersWorker, GuildsWorker } from './workers';

import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Log,
  LogsSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, CharactersEntity, GuildsEntity]),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Character.name, schema: CharactersSchema },
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
