import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';
import { valuationsQueue } from '@app/core';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketEntity } from '@app/pg';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([MarketEntity]),
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
      queueName: valuationsQueue.name,
      options: valuationsQueue.options,
    }),
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
