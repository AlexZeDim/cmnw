import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { itemsQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsEntity, KeysEntity } from '@app/pg';
import { postgresConfig, redisConfig } from '@app/configuration';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, ItemsEntity]),
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
      queueName: itemsQueue.name,
      options: itemsQueue.options,
    }),
  ],
  controllers: [],
  providers: [ItemsService],
})
export class ItemsModule {}
