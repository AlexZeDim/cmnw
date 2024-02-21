import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
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
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
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
