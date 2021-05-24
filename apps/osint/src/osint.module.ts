import { Module } from '@nestjs/common';
import { BullModule } from '@anchan828/nest-bullmq';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { charactersQueue, guildsQueue } from '@app/core';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Log,
  LogsSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Character.name, schema: CharactersSchema }
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
      },
    }),
    BullModule.registerQueue({ queueName: guildsQueue.name, options: guildsQueue.options }),
    BullModule.registerQueue({ queueName: charactersQueue.name, options: charactersQueue.options }),
  ],
  controllers: [],
  providers: [],
})
export class OsintModule {}
