import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { auctionsQueue, itemsQueue, pricingQueue, valuationsQueue } from '@app/core';
import { AuctionsWorker, ItemsWorker, PricingWorker, ValuationsWorker } from './workers';

import {
  Auction,
  AuctionsSchema,
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
  SkillLine,
  SkillLineSchema,
  SpellEffect,
  SpellEffectSchema,
  SpellReagents,
  SpellReagentsSchema,
  Token, TokenSchema,
  Valuations,
  ValuationsSchema,
} from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Item.name, schema: ItemsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Auction.name, schema: AuctionsSchema },
      { name: SkillLine.name, schema: SkillLineSchema },
      { name: SpellEffect.name, schema: SpellEffectSchema },
      { name: SpellReagents.name, schema: SpellReagentsSchema },
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
          password: redisConfig.password,
        },
      },
    }),
    BullModule.registerQueue({ queueName: auctionsQueue.name, options: auctionsQueue.options }),
    BullModule.registerQueue({ queueName: itemsQueue.name, options: itemsQueue.options }),
    BullModule.registerQueue({ queueName: pricingQueue.name, options: pricingQueue.options }),
    BullModule.registerQueue({ queueName: valuationsQueue.name, options: valuationsQueue.options }),
  ],
  controllers: [],
  providers: [AuctionsWorker, ValuationsWorker, PricingWorker, ItemsWorker],
})
export class DmaModule {}
