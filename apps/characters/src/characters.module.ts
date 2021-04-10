import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Key, KeysSchema, Realm, RealmsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';
import { CharactersWorker } from './characters.worker';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(queueCharacters.name),
  ],
  controllers: [],
  providers: [CharactersService, CharactersWorker],
})
export class CharactersModule {}
