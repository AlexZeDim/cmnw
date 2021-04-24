import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintModule } from './osint/osint.module';
import { DmaModule } from './dma/dma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
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
    QueueModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
