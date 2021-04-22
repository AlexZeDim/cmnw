import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { DmaController } from './dma.controller';
import { DmaService } from './dma.service';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    })
  ],
  controllers: [DmaController],
  providers: [DmaService],
})
export class DmaModule {}
