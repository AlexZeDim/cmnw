import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import {
  Pricing,
  PricingSchema,
  SkillLine,
  SkillLineSchema,
  SpellEffect,
  SpellEffectSchema,
  SpellReagents,
  SpellReagentsSchema,
} from '@app/mongo';
import { BullModule } from '@nestjs/bullmq';
import { pricingQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(mongoConfig.connectionString, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: SkillLine.name, schema: SkillLineSchema },
      { name: SpellEffect.name, schema: SpellEffectSchema },
      { name: SpellReagents.name, schema: SpellReagentsSchema },
      { name: Pricing.name, schema: PricingSchema },
    ]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
      defaultJobOptions: pricingQueue.defaultJobOptions
    }),
  ],
  controllers: [],
  providers: [PricingService],
})
export class PricingModule {}
