import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { mongoConfig, redisConfig } from '@app/configuration';
import { RealmsService } from './realms.service';
import { RealmsWorker } from './realms.worker';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Auction, AuctionsShema,
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';
import { queueRealms } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    MongooseModule.forFeature([{ name: Guild.name, schema: GuildsSchema }]),
    MongooseModule.forFeature([{ name: Character.name, schema: CharactersSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(queueRealms.name),
  ],
  controllers: [],
  providers: [RealmsService, RealmsWorker],
})
export class RealmsModule {}
