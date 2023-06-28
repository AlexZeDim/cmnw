import { Module } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@anchan828/nest-bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity } from '@app/pg';
import {
  mongoConfig,
  mongoOptionsConfig,
  postgresConfig,
  redisConfig,
} from '@app/configuration';

import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Log,
  LogsSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity]),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Key.name, schema: KeysSchema },
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
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
