import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, redisConfig } from '@app/configuration';
import { BullModule } from '@anchan828/nest-bullmq';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';
import {
  Character,
  CharactersSchema,
  Guild,
  GuildsSchema,
  Item,
  ItemsSchema,
  Key,
  KeysSchema,
  Log,
  LogsSchema,
  Realm,
  RealmsSchema,
  Subscription,
  SubscriptionsSchema,
} from '@app/mongo';
import { charactersQueue, guildsQueue } from '@app/core';

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.connection_string),
    MongooseModule.forFeature([
      { name: Log.name, schema: LogsSchema },
      { name: Key.name, schema: KeysSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Subscription.name, schema: SubscriptionsSchema },
      { name: Item.name, schema: ItemsSchema },
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
    BullModule.registerQueue({ queueName: guildsQueue.name, options: guildsQueue.options }),
  ],
  controllers: [OsintController],
  providers: [OsintService],
})
export class OsintModule {}
