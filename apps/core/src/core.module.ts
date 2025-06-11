import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysService } from './services/keys.service';
import { RealmsService } from './services/realms.service';
import { RealmsWorker } from './services/realms.worker';
import { KeysEntity } from '@app/pg';
import { postgresConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@nestjs/bullmq';
import { realmsQueue } from '@app/resources';



@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([KeysEntity]),
    BullModule.forRoot({
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    BullModule.registerQueue({
      name: realmsQueue.name,
      defaultJobOptions: realmsQueue.defaultJobOptions,
    }),
  ],
  controllers: [],
  providers: [KeysService, RealmsService, RealmsWorker],
})
export class CoreModule {}
