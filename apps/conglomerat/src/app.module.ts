import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintModule } from './osint/osint.module';
import { DmaModule } from './dma/dma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    RedisModule.forRoot({
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
    }),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    OsintModule,
    DmaModule,
    AuthModule,
    QueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
