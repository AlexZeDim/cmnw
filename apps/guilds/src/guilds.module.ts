import { Module } from '@nestjs/common';
import { postgresConfig, redisConfig } from '@app/configuration';
import { GuildsService } from './guilds.service';
import { BullModule } from '@nestjs/bullmq';
import { guildsQueue } from '@app/resources/queues/guilds.queue';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersEntity, GuildsEntity, KeysEntity } from '@app/pg';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, GuildsEntity, CharactersEntity]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: guildsQueue.name,
      defaultJobOptions: guildsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [GuildsService],
})
export class GuildsModule {}
