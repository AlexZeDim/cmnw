import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Auction, AuctionsShema, Key, KeysSchema, Realm, RealmsSchema } from '@app/mongo';
import { AuctionsWorker } from './auctions.worker';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueAuctions } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    MongooseModule.forFeature([{ name: Auction.name, schema: AuctionsShema }]),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(queueAuctions.name),
  ],
  controllers: [],
  providers: [AuctionsService, AuctionsWorker],
})
export class AuctionsModule {}
