import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WarcraftLogsService } from './warcraft-logs.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
  WarcraftLogs,
  WarcraftLogsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { charactersQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: WarcraftLogs.name, schema: WarcraftLogsSchema },
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
  ],
  controllers: [],
  providers: [WarcraftLogsService],
})
export class WarcraftlogsModule {}
