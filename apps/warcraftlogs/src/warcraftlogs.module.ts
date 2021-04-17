import { Module } from '@nestjs/common';
import { WarcraftlogsService } from './warcraftlogs.service';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { Key, KeysSchema, Realm, RealmsSchema, WarcraftLogs, WarcraftLogsSchema } from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { queueCharacters } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([{ name: Key.name, schema: KeysSchema }]),
    MongooseModule.forFeature([{ name: Realm.name, schema: RealmsSchema }]),
    MongooseModule.forFeature([{ name: WarcraftLogs.name, schema: WarcraftLogsSchema }]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue(queueCharacters.name),
  ],
  controllers: [],
  providers: [WarcraftlogsService],
})
export class WarcraftlogsModule {}
