import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { AuctionsService } from './auctions.service';
import { BullModule } from '@nestjs/bullmq';
import { auctionsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, MarketEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, MarketEntity]),
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
  ],
  controllers: [],
  providers: [AuctionsService],
})
export class AuctionsModule {}
