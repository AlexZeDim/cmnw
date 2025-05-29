import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { auctionsQueue, itemsQueue, pricingQueue, valuationsQueue } from '@app/core';
import { AuctionsWorker, ItemsWorker } from './workers';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, ItemsEntity, MarketEntity]),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      }
    }),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: auctionsQueue.name,
      defaultJobOptions: auctionsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: itemsQueue.name,
      defaultJobOptions: itemsQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: pricingQueue.name,
      defaultJobOptions: pricingQueue.defaultJobOptions,
    }),
    BullModule.registerQueue({
      name: valuationsQueue.name,
      defaultJobOptions: valuationsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [AuctionsWorker, ItemsWorker],
})
export class DmaModule {}
