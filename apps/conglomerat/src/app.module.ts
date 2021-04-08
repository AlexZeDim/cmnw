import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { AppService } from './app.service';
import { BullModule } from '@anchan828/nest-bullmq';
import { CharacterQueueOsintService } from '@app/character-queue-osint';
import { CharacterQueueOsintModule } from '@app/character-queue-osint';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port
        },
      },
    }),
    CharacterQueueOsintModule
  ],
  controllers: [],
  providers: [AppService, CharacterQueueOsintService],
})
export class AppModule {}
