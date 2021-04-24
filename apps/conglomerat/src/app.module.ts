import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintModule } from './osint/osint.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
