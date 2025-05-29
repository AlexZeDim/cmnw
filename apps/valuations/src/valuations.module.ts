import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { valuationsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Market,
  AuctionsSchema,
  Item,
  ItemsSchema,
  Pricing,
  PricingSchema,
} from '@app/mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Market.name, schema: AuctionsSchema },
    ]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions
    }),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
