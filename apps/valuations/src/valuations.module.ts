import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Auction,
  AuctionsShema,
  Gold,
  GoldsSchema,
  Item,
  ItemsSchema,
  Key,
  KeysSchema,
  Pricing,
  PricingSchema,
  Realm,
  RealmsSchema,
  Token,
  TokenSchema,
  Valuations,
  ValuationsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { valuationsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ValuationsWorker } from './valuations.worker';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Auction.name, schema: AuctionsShema },
      { name: Valuations.name, schema: ValuationsSchema },
      { name: Gold.name, schema: GoldsSchema },
      { name: Token.name, schema: TokenSchema },
      { name: Pricing.name, schema: PricingSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: valuationsQueue.name, options: valuationsQueue.options }),
  ],
  controllers: [],
  providers: [ValuationsService, ValuationsWorker],
})
export class ValuationsModule {}
