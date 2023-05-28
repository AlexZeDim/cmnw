import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Auction,
  AuctionsSchema,
  Item,
  ItemsSchema,
  Key,
  KeysSchema,
  Pricing,
  PricingSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { valuationsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Auction.name, schema: AuctionsSchema },
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
    BullModule.registerQueue({ queueName: valuationsQueue.name, options: valuationsQueue.options }),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
