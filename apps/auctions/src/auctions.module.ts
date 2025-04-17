import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { AuctionsService } from './auctions.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { auctionsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity]),
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
  ],
  controllers: [],
  providers: [AuctionsService],
})
export class AuctionsModule {}
