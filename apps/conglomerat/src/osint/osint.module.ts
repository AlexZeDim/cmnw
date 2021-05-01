import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';
import { Character, CharactersSchema, Key, KeysSchema, Log, LogsSchema, Realm, RealmsSchema } from '@app/mongo';
import { charactersQueue } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Key.name, schema: KeysSchema },
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
    BullModule.registerQueue({ queueName: charactersQueue.name, options: charactersQueue.options }),
  ],
  controllers: [OsintController],
  providers: [OsintService],
})
export class OsintModule {}
