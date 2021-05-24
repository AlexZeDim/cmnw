import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { Character, CharactersSchema, Key, KeysSchema, Log, LogsSchema, Realm, RealmsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { charactersQueue, CharactersWorker } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Character.name, schema: CharactersSchema }
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: charactersQueue.name, options: charactersQueue.options }),
  ],
  controllers: [],
  providers: [CharactersService, CharactersWorker],
})
export class CharactersModule {}
