import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Item,
  ItemsSchema,
  Key,
  KeysSchema,
  Pricing,
  PricingSchema,
  SkillLine,
  SkillLineSchema,
  SpellEffect,
  SpellEffectSchema,
  SpellReagents,
  SpellReagentsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { pricingQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: SkillLine.name, schema: SkillLineSchema },
      { name: SpellEffect.name, schema: SpellEffectSchema },
      { name: SpellReagents.name, schema: SpellReagentsSchema },
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
    BullModule.registerQueue({ queueName: pricingQueue.name, options: pricingQueue.options }),
  ],
  controllers: [],
  providers: [PricingService],
})
export class PricingModule {}
