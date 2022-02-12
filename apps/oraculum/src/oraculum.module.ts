import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig, mongoOptionsConfig, redisConfig } from '@app/configuration';
import { OraculumService } from './oraculum.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import {
  Account,
  AccountsSchema,
  Character,
  CharactersSchema,
  Entity,
  EntitySchema,
  Guild,
  GuildsSchema,
  Key,
  KeysSchema,
  Realm,
  RealmsSchema,
} from '@app/mongo';
import { BullModule } from '@anchan828/nest-bullmq';
import { deliveryQueue, messagesQueue } from '@app/core';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
    }),
    MongooseModule.forRoot(mongoConfig.connection_string, mongoOptionsConfig),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountsSchema },
      { name: Character.name, schema: CharactersSchema },
      { name: Guild.name, schema: GuildsSchema },
      { name: Realm.name, schema: RealmsSchema },
      { name: Entity.name, schema: EntitySchema },
      { name: Key.name, schema: KeysSchema },
    ]),
    BullModule.forRoot({
      options: {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
      },
    }),
    BullModule.registerQueue({ queueName: messagesQueue.name, options: messagesQueue.options }),
    BullModule.registerQueue({ queueName: deliveryQueue.name, options: deliveryQueue.options }),
  ],
  controllers: [],
  providers: [OraculumService],
})
export class OraculumModule {}
