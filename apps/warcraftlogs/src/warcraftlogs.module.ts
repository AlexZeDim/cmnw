import { Module } from '@nestjs/common';
import { WarcraftlogsService } from './warcraftlogs.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Key, KeysSchema, Realm, RealmsSchema, WarcraftLogs, WarcraftLogsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { charactersQueue } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: WarcraftLogs.name, schema: WarcraftLogsSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(charactersQueue.name),
  ],
  controllers: [],
  providers: [WarcraftlogsService],
})
export class WarcraftlogsModule {}
