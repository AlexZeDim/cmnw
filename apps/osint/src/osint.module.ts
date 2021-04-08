import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { redisConfig } from '@app/configuration';
import { OsintWorker } from './osint.worker';
import { CharacterQueueOsintService } from '@app/character-queue-osint';
import { CharacterQueueOsintModule } from '@app/character-queue-osint';

@Module({
  imports: [
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port
        },
      },
    }),
    CharacterQueueOsintModule,
  ],
  controllers: [],
  providers: [OsintWorker, CharacterQueueOsintService],
})
export class OsintModule {}
