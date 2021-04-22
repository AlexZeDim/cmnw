import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';

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
  controllers: [OsintController],
  providers: [OsintService],
})
export class OsintModule {}
