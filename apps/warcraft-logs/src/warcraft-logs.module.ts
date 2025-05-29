import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WarcraftLogsService } from './warcraft-logs.service';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { charactersQueue } from '@app/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersRaidLogsEntity, KeysEntity, RealmsEntity } from '@app/pg';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity, RealmsEntity, CharactersRaidLogsEntity]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: charactersQueue.name,
      defaultJobOptions: charactersQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [WarcraftLogsService],
})
export class WarcraftLogsModule {}
