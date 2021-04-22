import { Module } from '@nestjs/common';
import { WowprogressService } from './wowprogress.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Key, KeysSchema, Realm, RealmsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { guildsQueue } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema }
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(guildsQueue.name),
  ],
  controllers: [],
  providers: [WowprogressService],
})
export class WowprogressModule {}
