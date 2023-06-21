import { Module } from '@nestjs/common';
import {
  mongoConfig,
  mongoOptionsConfig,
  postgresConfig,
  redisConfig,
} from '@app/configuration';
import { RealmsService } from './realms.service';
import { RealmsWorker } from './realms.worker';
import { MongooseModule } from '@nestjs/mongoose';
import { realmsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@anchan828/nest-bullmq';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';
import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
  RealmPopulation,
  RealmsPopulationSchema,
} from '@app/mongo';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
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
      queueName: realmsQueue.name,
      options: realmsQueue.options,
    }),
  ],
  controllers: [],
  providers: [RealmsService, RealmsWorker],
})
export class RealmsModule {}
