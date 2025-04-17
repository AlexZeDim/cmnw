import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { guildsQueue } from '@app/core/queues/guilds.queue';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildsEntity, KeysEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity]),
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
      queueName: guildsQueue.name,
      options: guildsQueue.options,
    }),
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
