import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { Auction, AuctionsSchema, Key, KeysSchema, Realm, RealmsSchema } from '@app/mongo';
import { AuctionsWorker } from './auctions.worker';
import { BullModule } from '@anchan828/nest-bullmq';
import { auctionsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Realm.name, schema: RealmsSchema },
      { name: Auction.name, schema: AuctionsSchema },
      { name: Key.name, schema: KeysSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: auctionsQueue.name, options: auctionsQueue.options }),
  ],
  controllers: [],
  providers: [AuctionsService, AuctionsWorker],
})
export class AuctionsModule {}
