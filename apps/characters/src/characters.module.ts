import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Character, CharactersSchema, Key, KeysSchema, Log, LogsSchema, Realm, RealmsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { charactersQueue } from '@app/core';
import { CharactersWorker } from './characters.worker';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Log.name, schema: LogsSchema }]),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    MongooseModule.forFeature([{ name: Character.name, schema: CharactersSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(charactersQueue.name),
  ],
  controllers: [],
  providers: [CharactersService, CharactersWorker],
})
export class CharactersModule {}