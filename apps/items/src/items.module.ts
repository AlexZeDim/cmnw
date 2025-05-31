import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { PricingService } from './pricing.service';
import { BullModule } from '@nestjs/bullmq';
import { itemsQueue, pricingQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig, redisConfig } from '@app/configuration';
import {
  ItemsEntity,
  KeysEntity,
  PricingEntity,
  SkillLineEntity,
  SpellEffectEntity,
  SpellReagentsEntity,
} from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([
      KeysEntity,
      ItemsEntity,
      PricingEntity,
      SkillLineEntity,
      SpellEffectEntity,
      SpellReagentsEntity
    ]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
      defaultJobOptions: pricingQueue.defaultJobOptions
    }),
  ],
  controllers: [],
  providers: [PricingService],
})
export class ItemsModule {}
