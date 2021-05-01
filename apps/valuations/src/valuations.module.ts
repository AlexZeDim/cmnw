import { Module } from '@nestjs/common';
import { ValuationsService } from './valuations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { Item, ItemsSchema, Key, KeysSchema, Pricing, PricingSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { valuationsQueue } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Pricing.name, schema: PricingSchema }
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(valuationsQueue.name),
  ],
  controllers: [],
  providers: [ValuationsService],
})
export class ValuationsModule {}
