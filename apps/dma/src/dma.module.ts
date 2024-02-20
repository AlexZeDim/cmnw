import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@anchan828/nest-bullmq';
import { auctionsQueue, itemsQueue, pricingQueue, valuationsQueue } from '@app/core';
import { AuctionsWorker, ItemsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import {
  mongoConfig,
  mongoOptionsConfig,
  postgresConfig,
  redisConfig,
} from '@app/configuration';

import {
  Market,
  AuctionsSchema,
  Item,
  ItemsSchema,
  Pricing,
  PricingSchema,
  SkillLine,
  SkillLineSchema,
  SpellEffect,
  SpellEffectSchema,
  SpellReagents,
  SpellReagentsSchema,
  Token,
  TokenSchema,
  Valuations,
  ValuationsSchema,
} from '@app/mongo';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, ItemsEntity, MarketEntity]),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemsSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: Market.name, schema: AuctionsSchema },
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
    BullModule.registerQueue({
      queueName: auctionsQueue.name,
      options: auctionsQueue.options,
    }),
    BullModule.registerQueue({
      queueName: itemsQueue.name,
      options: itemsQueue.options,
    }),
    BullModule.registerQueue({
      queueName: pricingQueue.name,
      options: pricingQueue.options,
    }),
    BullModule.registerQueue({
      queueName: valuationsQueue.name,
      options: valuationsQueue.options,
    }),
  ],
  controllers: [],
  providers: [AuctionsWorker, ItemsWorker],
})
export class DmaModule {}
