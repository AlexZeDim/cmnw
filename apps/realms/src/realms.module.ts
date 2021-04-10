import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { redisConfig } from '@app/configuration';
import { RealmQueueOsintService } from '@app/realm-queue-osint';
import { RealmQueueOsintModule } from '@app/realm-queue-osint';

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
    RealmQueueOsintModule,
  ],
  controllers: [],
  providers: [RealmQueueOsintService],
})
export class RealmsModule {}
