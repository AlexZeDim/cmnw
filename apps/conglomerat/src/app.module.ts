import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';

import { AppService } from './app.service';

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
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
